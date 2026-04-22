import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, startPerformanceTimer, endPerformanceTimer } from "@/lib/logger";
import {
  appendItemsToCustomerSession,
  getCustomerSessionOrder,
  isCustomerSessionActiveStatus,
} from "@/lib/server/customer-session";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

const orderSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
      menu_item_size_id: z.string().uuid().optional(),
      topping_ids: z.array(z.string().uuid()).optional(),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const requestId = `order-create-${Date.now()}-${Math.random()}`;
  startPerformanceTimer(requestId);
  
  const protectionError = await protectEndpoint(
    req,
    RATE_LIMIT_CONFIGS.MUTATION,
    "customer-orders-create",
    requestId,
  );
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await req.json();
    const parse = orderSchema.safeParse(body);
    if (!parse.success) {
      await logger.error('orders-create-api', 'Order validation failed', {
        error: parse.error.errors,
        body
      });
      return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
    }

    const { sessionId, items, restaurantId } = parse.data;
    const orderRow = await getCustomerSessionOrder({ sessionId, restaurantId });
    if (!orderRow || !isCustomerSessionActiveStatus(orderRow.status)) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
    }

    const updatedOrder = await appendItemsToCustomerSession({
      restaurantId,
      sessionId,
      items: items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes ?? null,
        menu_item_size_id: item.menu_item_size_id ?? null,
        topping_ids: item.topping_ids ?? [],
      })),
    });

    await endPerformanceTimer(requestId, 'orders-create-api', restaurantId);
    return NextResponse.json({
      success: true,
      orderId: updatedOrder.order_id,
      totalAmount: updatedOrder.total_amount,
    });
  } catch (error) {
    await logger.error('orders-create-api', 'Unexpected order creation failure', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: "Failed to save order items" }, { status: 500 });
  }
}
