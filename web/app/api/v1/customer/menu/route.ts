import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";

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
      console.error("Error fetching menu categories:", categoriesError);
      return NextResponse.json({
        error: "Failed to load menu",
        details: categoriesError.message
      }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      categories: categories || []
    });

    // Add cache-control headers
    // Lite version can be cached longer (5 minutes) as it's less likely to change frequently
    // Full version with sizes/toppings cached for 2 minutes
    const maxAge = lite ? 300 : 120; // 5 minutes for lite, 2 minutes for full
    response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`);
    
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
