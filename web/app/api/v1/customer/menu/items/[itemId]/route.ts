import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";

interface RouteContext {
  params: Promise<{
    itemId: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { itemId } = await context.params;
    let restaurantId = req.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      const restaurantContext = await resolvePublicRestaurantContext({
        host: req.headers.get("host"),
        orgIdentifier: req.nextUrl.searchParams.get("org"),
        branchCode: req.nextUrl.searchParams.get("branch"),
        subdomain: req.nextUrl.searchParams.get("subdomain"),
      });

      if (!restaurantContext) {
        return NextResponse.json(
          { error: "No public restaurant context or restaurantId provided" },
          { status: 400 },
        );
      }

      restaurantId = restaurantContext.restaurant.id;
    }

    const { data: item, error } = await supabaseAdmin
      .from("menu_items")
      .select(`
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
        restaurant_id,
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
      `)
      .eq("id", itemId)
      .eq("restaurant_id", restaurantId)
      .order("position", { foreignTable: "menu_item_sizes", ascending: true })
      .order("position", { foreignTable: "toppings", ascending: true })
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in customer menu item API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load menu item data", details: message },
      { status: 500 },
    );
  }
}
