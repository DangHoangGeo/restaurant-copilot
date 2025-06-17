import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const tableId = req.nextUrl.searchParams.get("tableId");
    const guestsParam = req.nextUrl.searchParams.get("guests");
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");

    const parsedGuests = guestsParam ? parseInt(guestsParam, 10) : NaN;
    const guestCount = Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : 1;
    
    if (!tableId) {
      return NextResponse.json({ success: false, error: "Table ID is required" }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    //const host = req.headers.get("host") || "";
    //const subdomain = getSubdomainFromHost(host) || req.nextUrl.searchParams.get("subdomain");
    //const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

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
      .select("session_id, status, id, guest_count")
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
        orderId: existingOrder.id,
        guestCount: existingOrder.guest_count
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
        total_amount: 0,
        guest_count: guestCount
      }])
      .select("id, session_id, guest_count")
      .single();

    if (orderError || !newOrder) {
      console.error("Failed to create order:", orderError);
      return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 });
    }

    // Generate passcode from the last 4 characters of the order ID
    const passcode = newOrder.id.substring(newOrder.id.length - 4);
    
    return NextResponse.json({ 
      success: true, 
      sessionId: newOrder.session_id, 
      tableNumber: table.name,
      isNewSession: true,
      orderId: newOrder.id,
      guestCount: newOrder.guest_count,
      passcode: passcode // Add passcode to response
    });

  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
