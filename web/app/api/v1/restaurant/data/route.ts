import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain") || "";
  const includeMenu = req.nextUrl.searchParams.get("includeMenu") === "1";

  if (!subdomain) {
    return NextResponse.json({ error: "missing_subdomain" }, { status: 400 });
  }

  // Basic validation for subdomain format
  if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  try {
    // Use the new homepage data function for enhanced data
    const { data: homepageData, error: homepageError } = await supabaseAdmin
      .rpc('get_restaurant_homepage_data', { restaurant_subdomain: subdomain });

    if (homepageError) {
      console.error("Error fetching homepage data:", homepageError);
      return NextResponse.json(
        { error: homepageError.message },
        { status: 500 }
      );
    }

    if (!homepageData || homepageData.error) {
      return NextResponse.json(
        { error: homepageData?.error || "Restaurant not found" },
        { status: 404 }
      );
    }

    // Fetch menu items grouped by category (only if requested)
    let categories = null;
    if (includeMenu) {
      const { data: categoriesData, error: categoriesError } = await supabaseAdmin
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
            category_id,
            is_signature
          )
        `)
        .eq("restaurant_id", homepageData.restaurant.id)
        .order("position", { ascending: true })
        .order("position", { foreignTable: "menu_items", ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        return NextResponse.json(
          { error: categoriesError.message },
          { status: 500 }
        );
      }
      
      categories = categoriesData;
    }

    const response = NextResponse.json({
      restaurant: homepageData.restaurant,
      menu: categories,
      owners: homepageData.owners,
      gallery: homepageData.gallery,
      signature_dishes: homepageData.signature_dishes
    });

    // Add cache-control headers
    // Homepage data can be cached longer (10 minutes) when menu is not included
    // With menu, cache for shorter duration (3 minutes)
    const maxAge = includeMenu ? 180 : 600; // 3 minutes with menu, 10 minutes without
    response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`);
    
    return response;
  } catch (error) {
    console.error("Error fetching restaurant data:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}