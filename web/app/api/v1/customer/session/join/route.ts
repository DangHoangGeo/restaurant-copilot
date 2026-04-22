import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCustomerSessionOrder,
  isCustomerSessionActiveStatus,
  verifyCustomerSessionCode,
} from "@/lib/server/customer-session";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

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

const joinCustomerSessionSchema = z.object({
  sessionId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  passcode: z.string().min(1),
});

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Use POST to join a customer session" },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.MUTATION,
      "customer-session-join",
    );
    if (protectionError) {
      return protectionError;
    }

    const body = await req.json();
    const parsed = joinCustomerSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Session ID, restaurant ID, and session code are required",
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const { sessionId, passcode, restaurantId } = parsed.data;

    // Verify the session exists and is active
    const order = await getCustomerSessionOrder({ sessionId, restaurantId });
    if (!order) {
        return NextResponse.json({ 	
        success: false, 
        error: "Invalid session" 
      }, { status: 404 });
    }

    // Check if session is still active
    if (!isCustomerSessionActiveStatus(order.status)) {
      return NextResponse.json({ 
        success: false, 
        error: "Session is no longer active" 
      }, { status: 400 });
    }

    if (!verifyCustomerSessionCode({ sessionId, restaurantId, candidateCode: passcode })) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid session code" 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      sessionId: order.session_id,
      tableId: order.table_id,
      tableNumber: getTableName(order.tables),
      guestCount: order.guest_count,
      canAddItems: isCustomerSessionActiveStatus(order.status),
    });

  } catch (error) {
    console.error("Session join error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
