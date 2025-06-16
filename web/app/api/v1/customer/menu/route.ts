import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubdomainFromHost } from "@/lib/utils";

/**
 * Customer API: Get menu data by subdomain
 * Returns categories with menu items, sizes, and toppings
 */
export async function GET(req: NextRequest) {
  try {
    // Get subdomain from host header or query param
    const hostHeader = req.headers.get('host') || '';
    const subdomainFromHost = getSubdomainFromHost(hostHeader);
    const subdomainFromQuery = req.nextUrl.searchParams.get("subdomain");
    
    const subdomain = subdomainFromQuery || subdomainFromHost;

    if (!subdomain) {
      return NextResponse.json({ 
        error: "No subdomain provided" 
      }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({
        error: "Restaurant not found",
        details: restaurantError?.message
      }, { status: 404 });
    }

    // Fetch menu categories with items, sizes, and toppings
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select(`
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
          stock_level,
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
          )
        )
      `)
      .eq("restaurant_id", restaurant.id)
      .order("position", { ascending: true })
      .order("position", { foreignTable: "menu_items", ascending: true })
      .order("position", { foreignTable: "menu_items.menu_item_sizes", ascending: true })
      .order("position", { foreignTable: "menu_items.toppings", ascending: true });

    if (categoriesError) {
      console.error("Error fetching menu categories:", categoriesError);
      return NextResponse.json({
        error: "Failed to load menu",
        details: categoriesError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      categories: categories || []
    });

  } catch (error) {
    console.error("Unexpected error in customer menu API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Failed to load menu data",
      details: message
    }, { status: 500 });
  }
}
