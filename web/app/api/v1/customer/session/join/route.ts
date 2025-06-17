import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const passcode = req.nextUrl.searchParams.get("passcode");
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");
    if (!sessionId || !passcode) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID and passcode are required" 
      }, { status: 400 });
    }

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
    if (!['new', 'serving', 'ready'].includes(order.status)) {
      return NextResponse.json({ 
        success: false, 
        error: "Session is no longer active" 
      }, { status: 400 });
    }

    // Verify passcode (last 4 characters of order ID)
    const expectedPasscode = order.id.substring(order.id.length - 4);
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