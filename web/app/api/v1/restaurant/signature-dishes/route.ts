import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { cacheOrFetch } from "@/lib/server/cache";
import {
  CUSTOMER_MENU_TTL_SECONDS,
  customerSignatureDishesCacheKey,
  invalidateCustomerMenuCache,
} from "@/lib/server/customer-cache";

type SignatureDishesPayload = {
  menuItems?: unknown[];
  signature_dishes?: unknown[];
};

// GET - Fetch all menu items with signature status for a restaurant
export async function GET() {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await cacheOrFetch<SignatureDishesPayload>(
      customerSignatureDishesCacheKey(user.restaurantId),
      async () => {
        const { data: menuItems, error } = await supabaseAdmin
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
            is_signature,
            available,
            categories (
              name_en,
              name_ja,
              name_vi
            )
          `)
          .eq("restaurant_id", user.restaurantId)
          .eq("available", true)
          .order("position", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        return { menuItems };
      },
      { ttlSeconds: CUSTOMER_MENU_TTL_SECONDS },
    );

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `private, max-age=${CUSTOMER_MENU_TTL_SECONDS}`,
      },
    });
  } catch (error) {
    console.error("Error in menu items GET:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT - Update signature dish status for menu items
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest();

    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { menu_item_ids } = body;

    if (!Array.isArray(menu_item_ids)) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    // First, remove signature status from all items in this restaurant
    const { error: clearError } = await supabaseAdmin
      .from("menu_items")
      .update({ is_signature: false })
      .eq("restaurant_id", user.restaurantId);

    if (clearError) {
      console.error("Error clearing signature dishes:", clearError);
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    // Then set signature status for selected items
    if (menu_item_ids.length > 0) {
      const { error } = await supabaseAdmin
        .from("menu_items")
        .update({ is_signature: true })
        .eq("restaurant_id", user.restaurantId)
        .in("id", menu_item_ids);

      if (error) {
        console.error("Error updating signature dishes:", error);
        await invalidateCustomerMenuCache(user.restaurantId);
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
      .eq("restaurant_id", user.restaurantId)
      .eq("is_signature", true)
      .eq("available", true)
      .order("position", { ascending: true });

    if (fetchError) {
      console.error("Error fetching updated signature dishes:", fetchError);
      await invalidateCustomerMenuCache(user.restaurantId);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    await invalidateCustomerMenuCache(user.restaurantId);

    return NextResponse.json({ signature_dishes: dishes });
  } catch (error) {
    console.error("Error in signature dishes PUT:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
