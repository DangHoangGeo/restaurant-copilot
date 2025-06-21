import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch owner story for a restaurant
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "missing_restaurant_id" }, { status: 400 });
  }

  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .select("owner_story_en, owner_story_ja, owner_story_vi")
      .eq("id", restaurantId)
      .single();

    if (error) {
      console.error("Error fetching owner story:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json({ error: "restaurant_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      owner_story: {
        en: restaurant.owner_story_en,
        ja: restaurant.owner_story_ja,
        vi: restaurant.owner_story_vi,
      },
    });
  } catch (error) {
    console.error("Error in owner story GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT - Update owner story for a restaurant
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, owner_story_en, owner_story_ja, owner_story_vi } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "missing_restaurant_id" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (owner_story_en !== undefined) updateData.owner_story_en = owner_story_en;
    if (owner_story_ja !== undefined) updateData.owner_story_ja = owner_story_ja;
    if (owner_story_vi !== undefined) updateData.owner_story_vi = owner_story_vi;

    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .update(updateData)
      .eq("id", restaurant_id)
      .select("owner_story_en, owner_story_ja, owner_story_vi")
      .single();

    if (error) {
      console.error("Error updating owner story:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json({ error: "restaurant_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      owner_story: {
        en: restaurant.owner_story_en,
        ja: restaurant.owner_story_ja,
        vi: restaurant.owner_story_vi,
      },
    });
  } catch (error) {
    console.error("Error in owner story PUT:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
