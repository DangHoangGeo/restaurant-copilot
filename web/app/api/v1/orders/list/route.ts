import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings";
import { getSubdomainFromHost } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  const restaurantId = subdomain
    ? await getRestaurantIdFromSubdomain(subdomain)
    : null;

  if (!restaurantId) {
    return NextResponse.json(
      { success: false, error: "Invalid restaurant" },
      { status: 400 },
    );
  }

  const onlyToday = req.nextUrl.searchParams.get("today") === "true";
  const query = supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      table_id,
      status,
      total_amount,
      created_at,
      order_items (
        id,
        quantity,
        notes,
        status,
        created_at,
        menu_items (
          id,
          name_en,
          name_ja,
          name_vi,
          category_id,
          categories ( id, name_en, name_ja, name_vi )
        )
      ),
      tables ( name )
    `,
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (onlyToday) {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    query.gte("created_at", start);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, orders: data });
}
