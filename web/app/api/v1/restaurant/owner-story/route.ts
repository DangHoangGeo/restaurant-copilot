import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";

// GET - Fetch owner story for a restaurant
export async function GET() {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .select("owner_story_en, owner_story_ja, owner_story_vi")
      .eq("id", user.restaurantId)
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
    const user = await getUserFromRequest();

    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { owner_story_en, owner_story_ja, owner_story_vi } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (owner_story_en !== undefined) updateData.owner_story_en = owner_story_en;
    if (owner_story_ja !== undefined) updateData.owner_story_ja = owner_story_ja;
    if (owner_story_vi !== undefined) updateData.owner_story_vi = owner_story_vi;

    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .update(updateData)
      .eq("id", user.restaurantId)
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
