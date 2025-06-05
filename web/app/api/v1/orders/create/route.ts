import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, orderItems, menuItems as dbMenuItems } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getRestaurantIdFromMiddleware } from "@/lib/utils/apiUtils";

// Zod schema for request validation
const OrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().min(1),
  notes: z.string().optional().nullable(),
});

const CreateOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1, "Order must contain at least one item."),
});

export async function POST(request: NextRequest) {
  try {
    const restaurantId = await getRestaurantIdFromMiddleware();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized or restaurantId not found" }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request payload", details: validation.error.flatten() }, { status: 400 });
    }

    const { sessionId, items } = validation.data;

    // 1. Verify sessionId
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.sessionId, sessionId),
        eq(orders.restaurantId, restaurantId)
      ),
    });

    if (!order) {
      return NextResponse.json({ error: "Session not found or does not belong to this restaurant." }, { status: 404 });
    }
    if (order.status !== "new") {
      return NextResponse.json({ error: "Order has already been processed or is not new." }, { status: 400 });
    }

    // 2. Verify each menuItemId and calculate total_amount
    const menuItemIds = items.map((item) => item.menuItemId);
    const dbItems = await db.query.dbMenuItems.findMany({
      where: and(
        eq(dbMenuItems.restaurantId, restaurantId),
        inArray(dbMenuItems.id, menuItemIds)
      ),
    });

    let totalAmount = 0;
    const orderItemsToInsert = [];

    for (const item of items) {
      const dbItem = dbItems.find((dbMenuItem) => dbMenuItem.id === item.menuItemId);
      if (!dbItem) {
        return NextResponse.json({ error: `Menu item with ID ${item.menuItemId} not found.` }, { status: 400 });
      }
      if (!dbItem.available) {
        return NextResponse.json({ error: `Menu item '${dbItem.name}' is currently unavailable.` }, { status: 400 });
      }
      // TODO: Check weekday_visibility if applicable at the time of order confirmation
      // For now, assuming 'available' is the primary check for checkout

      totalAmount += dbItem.price * item.quantity;
      orderItemsToInsert.push({
        orderId: order.id, // Use the actual order ID from the fetched order
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: dbItem.price, // Store the price at the time of order
        notes: item.notes,
      });
    }

    // Start a transaction
    await db.transaction(async (tx) => {
        // 3. Update orders row
        await tx
        .update(orders)
        .set({
            totalAmount,
            status: "pending_payment", // Or "confirmed_cash" - assuming cash means pending until payment
            orderDate: new Date(), // Update orderDate to confirmation time
        })
        .where(eq(orders.id, order.id));

        // 4. Insert into order_items
        if (orderItemsToInsert.length > 0) {
            await tx.insert(orderItems).values(orderItemsToInsert);
        }
    });


    return NextResponse.json({ success: true, orderId: order.id, newStatus: "pending_payment" }, { status: 201 });

  } catch (error) {
    console.error("Error creating order:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload", details: error.flatten() }, { status: 400 });
    }
    // Add more specific error checks if needed
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
