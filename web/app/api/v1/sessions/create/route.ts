import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getRestaurantIdFromMiddleware } from "@/lib/utils/apiUtils"; // Assuming this utility exists

export async function GET(request: NextRequest) {
  try {
    const restaurantId = await getRestaurantIdFromMiddleware();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized or restaurantId not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      return NextResponse.json({ error: "tableId is required" }, { status: 400 });
    }

    // Validate tableId against the restaurant (assuming a 'tables' table with restaurant_id)
    // This is a placeholder validation. Replace with actual schema and logic.
    const table = await db.query.tables.findFirst({
      where: (tables, { eq, and }) => and(eq(tables.id, tableId), eq(tables.restaurantId, restaurantId)),
    });

    if (!table) {
      return NextResponse.json({ error: "Invalid tableId for this restaurant" }, { status: 403 });
    }

    // Check for an existing 'new' session for this table
    let existingOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.restaurantId, restaurantId),
        eq(orders.tableId, tableId),
        eq(orders.status, "new")
      ),
    });

    if (existingOrder) {
      return NextResponse.json({ sessionId: existingOrder.sessionId }, { status: 200 });
    }

    // Create a new session
    const sessionId = uuidv4();
    const newOrderData = {
      restaurantId,
      tableId,
      sessionId,
      status: "new" as const, // Ensure 'new' is of type 'new'
      totalAmount: 0, // Initial total
      // Add other necessary fields with default values
      // e.g., customerId: null, notes: null, orderDate: new Date()
      orderDate: new Date(),
      // items: [], // If items are stored as JSONB, initialize as empty array
    };

    // If your schema expects `items` and it's a JSONB column that cannot be null:
    // const newOrderDataWithItems = { ...newOrderData, items: [] };
    // await db.insert(orders).values(newOrderDataWithItems);

    // Assuming 'items' can be null or has a default in the DB / not strictly needed on creation
    await db.insert(orders).values(newOrderData);

    // Verify insertion if needed, though insert itself would throw on error
    // const createdOrder = await db.query.orders.findFirst({
    //   where: eq(orders.sessionId, sessionId),
    // });

    return NextResponse.json({ sessionId }, { status: 201 });

  } catch (error) {
    console.error("Error creating session:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Consider more specific error handling based on potential DB errors
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
