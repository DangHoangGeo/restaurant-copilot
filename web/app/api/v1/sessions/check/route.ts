import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "../../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../../lib/utils";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    const host = req.headers.get("host") || "";
    const subdomain = getSubdomainFromHost(host);
    const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: "Invalid restaurant" }, { status: 400 });
    }

    // Check session status
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        session_id,
        status,
        table_id,
        total_amount,
        created_at,
        tables (
          table_number
        )
      `)
      .eq("session_id", sessionId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (error || !order) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid session",
        sessionStatus: "invalid"
      }, { status: 404 });
    }

    // Determine session status
    let sessionStatus = "active";
    if (order.status === "completed") {
      sessionStatus = "completed";
    } else if (order.status === "cancelled") {
      sessionStatus = "cancelled";
    } else if (order.status === "new") {
      sessionStatus = "active";
    } else {
      sessionStatus = "processing";
    }

    return NextResponse.json({
      success: true,
      sessionStatus,
      orderId: order.id,
      tableId: order.table_id,
      tableNumber: order.tables?.[0]?.table_number,
      totalAmount: order.total_amount,
      canAddItems: order.status === "new"
    });

  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}