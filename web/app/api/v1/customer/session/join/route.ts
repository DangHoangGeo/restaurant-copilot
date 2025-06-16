import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings";
import { getSubdomainFromHost } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const passcode = req.nextUrl.searchParams.get("passcode");
    
    if (!sessionId || !passcode) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID and passcode are required" 
      }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    const host = req.headers.get("host") || "";
    const subdomain = getSubdomainFromHost(host) || req.nextUrl.searchParams.get("subdomain");
    const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

    if (!restaurantId) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid restaurant" 
      }, { status: 400 });
    }

    // Verify the session exists and is active
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        session_id,
        status,
        table_id,
        guest_count,
        tables (
          name
        )
      `)
      .eq("session_id", sessionId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (orderError || !order) {
	console.error("Order not found or error fetching order:", orderError);
        return NextResponse.json({ 	
        success: false, 
        error: "Invalid session" 
      }, { status: 404 });
    }

    // Check if session is still active
    if (!['new', 'preparing', 'ready'].includes(order.status)) {
      return NextResponse.json({ 
        success: false, 
        error: "Session is no longer active" 
      }, { status: 400 });
    }

    // Verify passcode (first 4 characters of order ID)
    const expectedPasscode = order.id.substring(0, 4);
    if (passcode.toLowerCase() !== expectedPasscode.toLowerCase()) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid passcode" 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      sessionId: order.session_id,
      tableId: order.table_id,
      tableNumber: order.tables?.[0]?.name,
      guestCount: order.guest_count,
      canAddItems: order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'expired'
    });

  } catch (error) {
    console.error("Session join error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}