import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain") || "";

  if (!subdomain) {
    return NextResponse.json({ error: "missing_subdomain" }, { status: 400 });
  }

  // Basic validation for subdomain format
  if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  try {
    // Fetch restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: restaurantError?.message || "Restaurant not found" },
        { status: 404 }
      );
    }

    // Fetch menu items grouped by category
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select(`
        id,
        name_en,
        name_ja,
        name_vi,
        position,
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
          category_id
        )
      `)
      .eq("restaurant_id", restaurant.id)
      .order("position", { ascending: true })
      .order("position", { foreignTable: "menu_items", ascending: true });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      restaurant,
      menu: categories
    });
  } catch (error) {
    console.error("Error fetching restaurant data:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}