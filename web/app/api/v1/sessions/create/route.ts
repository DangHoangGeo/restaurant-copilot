import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "../../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../../lib/utils";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const tableId = req.nextUrl.searchParams.get("tableId");
    console.log('GET create session for tableId:', tableId);
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
      console.error("Table not found or does not belong to this restaurant:", tableError);
      return NextResponse.json({ success: false, error: "Invalid table ID" }, { status: 404 });
    }

    // Check if there's already an active session for this table
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("session_id, status, id")
      .eq("table_id", tableId)
      .eq("restaurant_id", restaurantId)
      .neq("status", "completed") // Exclude completed orders
      .neq("status", "cancelled") // Exclude cancelled orders
      .neq("status", "expired") // Exclude expired orders
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's already an active session, return it
    if (existingOrder) {
      console.log('Returning existing session:', existingOrder.session_id);
      return NextResponse.json({ 
        success: true, 
        sessionId: existingOrder.session_id, 
        tableNumber: table.name,
        isNewSession: false,
        orderId: existingOrder.id
      });
    }

    // Create new session with a UUID
    const sessionId = randomUUID();
    console.log('Creating new session with ID:', sessionId);
    
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([{
        restaurant_id: restaurantId,
        table_id: tableId,
        session_id: sessionId,
        status: "new",
        total_amount: 0
      }])
      .select("id, session_id")
      .single();

    if (orderError || !newOrder) {
      console.error("Failed to create order:", orderError);
      return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 });
    }

    console.log('Created new order with session ID:', newOrder.session_id);
    return NextResponse.json({ 
      success: true, 
      sessionId: newOrder.session_id, 
      tableNumber: table.name,
      isNewSession: true,
      orderId: newOrder.id
    });

  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
