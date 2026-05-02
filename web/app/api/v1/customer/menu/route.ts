import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";
import { cacheOrFetch } from "@/lib/server/cache";
import {
  CUSTOMER_MENU_TTL_SECONDS,
  customerMenuCacheKey,
} from "@/lib/server/customer-cache";

type CustomerMenuPayload = {
  success: true;
  categories: unknown[];
};

/**
 * Customer API: Get menu data by subdomain
 * Returns categories with menu items, sizes, and toppings
 */
export async function GET(req: NextRequest) {
  try {
    // Check if restaurantId is provided directly (preferred method)
    const restaurantIdParam = req.nextUrl.searchParams.get("restaurantId");
    const lite = req.nextUrl.searchParams.get("lite") === "1";
    
    let restaurantId: string;
    
    if (restaurantIdParam) {
      // Use provided restaurant ID directly (avoids subdomain lookup)
      restaurantId = restaurantIdParam;
    } else {
      const restaurantContext = await resolvePublicRestaurantContext({
        host: req.headers.get('host'),
        orgIdentifier: req.nextUrl.searchParams.get('org'),
        branchCode: req.nextUrl.searchParams.get('branch'),
        subdomain: req.nextUrl.searchParams.get("subdomain"),
      });

      if (!restaurantContext) {
        return NextResponse.json({ 
          error: "No public restaurant context or restaurantId provided" 
        }, { status: 400 });
      }
      restaurantId = restaurantContext.restaurant.id;
    }

    // Fetch menu categories with items, optionally including sizes and toppings
    const baseSelectQuery = `
      id,
      name_en,
      name_ja,
      name_vi,
      position,
      restaurant_id,
      menu_items (
        id,
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price,
        image_url,
        available,
        weekday_visibility,
        position,
        category_id,
        tags,
        prep_station,
        stock_level${lite ? '' : `,
        menu_item_sizes (
          id,
          size_key,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        ),
        toppings (
          id,
          name_en,
          name_ja,
          name_vi,
          price,
          position
        )`}
      )
    `;

    const payload = await cacheOrFetch<CustomerMenuPayload>(
      customerMenuCacheKey({ restaurantId, lite }),
      async () => {
        let query = supabaseAdmin
          .from("categories")
          .select(baseSelectQuery)
          .eq("restaurant_id", restaurantId)
          .order("position", { ascending: true })
          .order("position", { foreignTable: "menu_items", ascending: true });

        // Only add ordering for sizes and toppings if not lite mode
        if (!lite) {
          query = query
            .order("position", { foreignTable: "menu_items.menu_item_sizes", ascending: true })
            .order("position", { foreignTable: "menu_items.toppings", ascending: true });
        }

        const { data: categories, error: categoriesError } = await query;

        if (categoriesError) {
          throw new Error(categoriesError.message);
        }

        return {
          success: true,
          categories: categories || [],
        };
      },
      { ttlSeconds: CUSTOMER_MENU_TTL_SECONDS },
    );

    const response = NextResponse.json(payload);

    response.headers.set('Cache-Control', `public, max-age=${CUSTOMER_MENU_TTL_SECONDS}, s-maxage=${CUSTOMER_MENU_TTL_SECONDS}, stale-while-revalidate=60`);
    
    return response;

  } catch (error) {
    console.error("Unexpected error in customer menu API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Failed to load menu data",
      details: message
    }, { status: 500 });
  }
}
