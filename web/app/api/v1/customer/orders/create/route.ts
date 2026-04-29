import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, startPerformanceTimer, endPerformanceTimer } from "@/lib/logger";
import {
  appendItemsToCustomerSession,
  getCustomerSessionOrder,
  isCustomerSessionActiveStatus,
} from "@/lib/server/customer-session";
import { dispatchBackgroundJob } from "@/lib/server/jobs";
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

function serializeOrderCreationError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  }

  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    return {
      code: errorRecord.code,
      message: errorRecord.message,
      details: errorRecord.details,
      hint: errorRecord.hint,
      status: errorRecord.status,
    };
  }

  return {
    message: String(error),
  };
}

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

    try {
      await Promise.all([
        dispatchBackgroundJob("receipt.confirmation", {
          jobId: `${requestId}-receipt`,
          restaurantId,
          orderId: updatedOrder.order_id,
          metadata: { sessionId },
        }),
        dispatchBackgroundJob("analytics.snapshot_rebuild", {
          jobId: `${requestId}-analytics`,
          restaurantId,
          orderId: updatedOrder.order_id,
        }),
      ]);
    } catch (jobError) {
      await logger.warn("orders-create-api", "Order side-effect dispatch failed", {
        error: serializeOrderCreationError(jobError),
        orderId: updatedOrder.order_id,
        restaurantId,
      }, restaurantId);
    }

    await endPerformanceTimer(requestId, 'orders-create-api', restaurantId);
    return NextResponse.json({
      success: true,
      orderId: updatedOrder.order_id,
      totalAmount: updatedOrder.total_amount,
    });
  } catch (error) {
    await logger.error('orders-create-api', 'Unexpected order creation failure', {
      error: serializeOrderCreationError(error),
    });
    return NextResponse.json({ success: false, error: "Failed to save order items" }, { status: 500 });
  }
}
