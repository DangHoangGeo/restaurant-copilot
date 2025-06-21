import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch all gallery images for a restaurant
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "missing_restaurant_id" }, { status: 400 });
  }

  try {
    const { data: images, error } = await supabaseAdmin
      .from("restaurant_gallery_images")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching gallery images:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error in gallery GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create a new gallery image
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, image_url, caption, alt_text, sort_order, is_hero } = body;

    if (!restaurant_id || !image_url || !alt_text) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    // If no sort_order provided, get the next available position
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const { data: lastImage } = await supabaseAdmin
        .from("restaurant_gallery_images")
        .select("sort_order")
        .eq("restaurant_id", restaurant_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      finalSortOrder = lastImage ? lastImage.sort_order + 1 : 0;
    }

    const { data: image, error } = await supabaseAdmin
      .from("restaurant_gallery_images")
      .insert({
        restaurant_id,
        image_url,
        caption: caption || null,
        alt_text,
        sort_order: finalSortOrder,
        is_hero: is_hero || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating gallery image:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Error in gallery POST:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
