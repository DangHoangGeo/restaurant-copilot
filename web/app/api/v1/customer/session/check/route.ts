import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Customer API: Check session status
 * Used for validating existing sessions and auto-refresh capabilities
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ 
      error: "Session ID required" 
    }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        session_id,
        status,
        table_id,
        guest_count,
        total_amount,
        created_at,
        updated_at,
        tables (
          name,
          capacity
        )
      `)
      .eq("session_id", sessionId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: "Session not found"
      }, { status: 404 });
    }

    const isActive = !['completed', 'cancelled', 'expired'].includes(data.status);
    const canAddItems = isActive && data.status !== 'served';

    return NextResponse.json({
      success: true,
      sessionStatus: isActive ? 'active' : 'expired',
      canAddItems,
      sessionData: {
        sessionId: data.session_id,
        orderId: data.id,
        tableNumber: data.tables?.[0]?.name,
        guestCount: data.guest_count,
        status: data.status,
        totalAmount: data.total_amount,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to check session status"
    }, { status: 500 });
  }
}
