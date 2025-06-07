import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "../../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../../lib/utils";

export async function GET(req: NextRequest) {
  try {
    const tableId = req.nextUrl.searchParams.get("tableId");
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    
    if (!tableId) {
      return NextResponse.json({ success: false, error: "Table ID is required" }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    const host = req.headers.get("host") || "";
    const subdomain = getSubdomainFromHost(host);
    const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: "Invalid restaurant" }, { status: 400 });
    }

    // Verify table belongs to this restaurant
    const { data: table, error: tableError } = await supabaseAdmin
      .from("tables")
      .select("id, name")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ success: false, error: "Invalid table ID" }, { status: 404 });
    }

    // Get current active session for this table
    const { data: activeSession } = await supabaseAdmin
      .from("orders")
      .select("session_id")
      .eq("table_id", tableId)
      .eq("restaurant_id", restaurantId)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .neq("status", "expired")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch all orders for this table (last 24 hours to keep it manageable)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        session_id,
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
            price
          )
        )
      `)
      .eq("table_id", tableId)
      .eq("restaurant_id", restaurantId)
	  .eq("session_id", sessionId || activeSession?.session_id)
	  .neq("status", "completed")
	  .neq("status", "cancelled")
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      currentSessionId: activeSession?.session_id || null,
      tableNumber: table.name
    });

  } catch (error) {
    console.error("Order history error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}