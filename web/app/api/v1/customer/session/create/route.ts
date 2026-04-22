import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import {
  createCustomerOrderSession,
  createCustomerSessionCode,
} from "@/lib/server/customer-session";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

const createCustomerSessionSchema = z.object({
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  guests: z.number().int().min(1).max(20).optional().default(1),
});

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Use POST to create a customer session" },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.MUTATION,
      "customer-session-create",
    );
    if (protectionError) {
      return protectionError;
    }

    const body = await req.json();
    const parsed = createCustomerSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid session request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tableId, restaurantId, guests } = parsed.data;

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

    const orderSession = await createCustomerOrderSession({
      restaurantId,
      tableId,
      guestCount: guests,
    });
    const sessionCode = createCustomerSessionCode(
      orderSession.session_id,
      restaurantId,
    );

    return NextResponse.json({
      success: true,
      sessionId: orderSession.session_id,
      tableNumber: table.name,
      isNewSession: orderSession.createdNew,
      orderId: orderSession.id,
      guestCount: orderSession.guest_count,
      sessionCode,
      passcode: sessionCode,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
