import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerSessionOrder,
  isCustomerSessionActiveStatus,
} from "@/lib/server/customer-session";

function getTableName(
  table:
    | { name?: string | null }
    | { name?: string | null }[]
    | null
    | undefined,
): string | undefined {
  if (!table) return undefined;
  return Array.isArray(table) ? table[0]?.name ?? undefined : table.name ?? undefined;
}

/**
 * Customer API: Check session status
 * Used for validating existing sessions and auto-refresh capabilities
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (!sessionId) {
    return NextResponse.json({
      error: "Session ID required"
    }, { status: 400 });
  }

  try {
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: "Restaurant ID required",
      }, { status: 400 });
    }

    const data = await getCustomerSessionOrder({ sessionId, restaurantId });
    if (!data) {
      return NextResponse.json({
        success: false,
        error: "Session not found"
      }, { status: 404 });
    }

    const isActive = isCustomerSessionActiveStatus(data.status);
    const canAddItems = isActive;

    return NextResponse.json({
      success: true,
      sessionStatus: isActive ? 'active' : 'expired',
      canAddItems,
      sessionData: {
        sessionId: data.session_id,
        orderId: data.id,
        tableNumber: getTableName(data.tables),
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
