import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch signature dishes for a restaurant
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "missing_restaurant_id" }, { status: 400 });
  }

  try {
    const { data: dishes, error } = await supabaseAdmin
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
        position,
        categories (
          name_en,
          name_ja,
          name_vi
        )
      `)
      .eq("restaurant_id", restaurantId)
      .eq("is_signature", true)
      .eq("available", true)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching signature dishes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signature_dishes: dishes });
  } catch (error) {
    console.error("Error in signature dishes GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT - Update signature dish status for menu items
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, menu_item_ids } = body;

    if (!restaurant_id || !Array.isArray(menu_item_ids)) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    // First, remove signature status from all items in this restaurant
    await supabaseAdmin
      .from("menu_items")
      .update({ is_signature: false })
      .eq("restaurant_id", restaurant_id);

    // Then set signature status for selected items
    if (menu_item_ids.length > 0) {
      const { error } = await supabaseAdmin
        .from("menu_items")
        .update({ is_signature: true })
        .eq("restaurant_id", restaurant_id)
        .in("id", menu_item_ids);

      if (error) {
        console.error("Error updating signature dishes:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Fetch and return updated signature dishes
    const { data: dishes, error: fetchError } = await supabaseAdmin
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
        position,
        categories (
          name_en,
          name_ja,
          name_vi
        )
      `)
      .eq("restaurant_id", restaurant_id)
      .eq("is_signature", true)
      .eq("available", true)
      .order("position", { ascending: true });

    if (fetchError) {
      console.error("Error fetching updated signature dishes:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ signature_dishes: dishes });
  } catch (error) {
    console.error("Error in signature dishes PUT:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
