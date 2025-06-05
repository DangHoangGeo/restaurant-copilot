import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookings, bookingItems, tables, menuItems as dbMenuItems } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getRestaurantIdFromMiddleware } from "@/lib/utils/apiUtils";
import { v4 as uuidv4 } from "uuid";

// Zod schema for pre-order items
const PreOrderItemSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID for pre-order."),
  quantity: z.number().min(1, "Pre-order quantity must be at least 1."),
});

// Zod schema for booking details
const CreateBookingSchema = z.object({
  tableId: z.string().uuid("Table ID is required."),
  customerName: z.string().min(1, "Customer name is required."),
  customerPhone: z.string().min(1, "Customer phone number is required."), // Basic validation, consider more specific phone validation
  customerEmail: z.string().email("Invalid email format.").optional().nullable(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD."),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format, expected HH:MM."),
  partySize: z.number().min(1, "Party size must be at least 1."),
  notes: z.string().optional().nullable(),
  preOrderItems: z.array(PreOrderItemSchema).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const restaurantId = await getRestaurantIdFromMiddleware();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized or restaurantId not found" }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request payload", details: validation.error.flatten() }, { status: 400 });
    }

    const {
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      bookingDate,
      bookingTime,
      partySize,
      notes,
      preOrderItems,
    } = validation.data;

    // 1. Verify tableId belongs to restaurantId
    const table = await db.query.tables.findFirst({
      where: and(eq(tables.id, tableId), eq(tables.restaurantId, restaurantId)),
      columns: { id: true, capacity: true },
    });
    if (!table) {
      return NextResponse.json({ error: "Table not found or does not belong to this restaurant." }, { status: 400 });
    }
    // Optionally, check if partySize exceeds table.capacity (though this might be handled client-side too)
    if (partySize > table.capacity) {
        return NextResponse.json({ error: `Party size of ${partySize} exceeds capacity of table ${table.id} (${table.capacity}).` }, { status: 400 });
    }


    // 2. Verify each menuItemId in preOrderItems (if any)
    if (preOrderItems && preOrderItems.length > 0) {
      const menuItemIds = preOrderItems.map(item => item.menuItemId);
      const dbItems = await db.query.dbMenuItems.findMany({
        where: and(
          eq(dbMenuItems.restaurantId, restaurantId),
          inArray(dbMenuItems.id, menuItemIds)
        ),
        columns: { id: true, available: true, name_en: true /* For error messages */ }
      });

      for (const preOrderItem of preOrderItems) {
        const dbItem = dbItems.find(item => item.id === preOrderItem.menuItemId);
        if (!dbItem) {
          return NextResponse.json({ error: `Pre-order item with ID ${preOrderItem.menuItemId} not found.` }, { status: 400 });
        }
        if (!dbItem.available) { // Basic availability check
          return NextResponse.json({ error: `Pre-order item '${dbItem.name_en || preOrderItem.menuItemId}' is currently unavailable.` }, { status: 400 });
        }
        // TODO: Add weekday_visibility check if necessary for pre-orders
      }
    }

    // 3. Check for booking conflicts
    // A conflict exists if there's another booking for the same table, date, and time,
    // and its status is not 'canceled' or 'rejected'.
    // This simple check assumes bookings are for a fixed duration. More complex logic might be needed for overlapping times.
    const bookingDateTime = `${bookingDate} ${bookingTime}:00`; // Combine to a full timestamp string for DB

    const conflictingBooking = await db.query.bookings.findFirst({
        where: and(
            eq(bookings.tableId, tableId),
            eq(bookings.restaurantId, restaurantId),
            eq(bookings.bookingDatetime, new Date(bookingDateTime)), // Ensure correct date object comparison
            inArray(bookings.status, ["pending_confirmation", "confirmed", "checked_in"]) // Active statuses
        )
    });

    if (conflictingBooking) {
      return NextResponse.json({ error: "This time slot for the selected table is already booked or pending. Please choose another time or table." }, { status: 409 });
    }

    // 4. Insert into bookings table and booking_items (if any)
    const bookingId = uuidv4();

    await db.transaction(async (tx) => {
      await tx.insert(bookings).values({
        id: bookingId,
        restaurantId,
        tableId,
        customerId: null, // TODO: Link to customer if exists/logged in
        customerName,
        customerPhone,
        customerEmail,
        bookingDatetime: new Date(bookingDateTime),
        partySize,
        status: "pending_confirmation", // Default status
        notes,
        createdAt: new Date(),
        // totalPreOrderAmount: 0, // Calculate if needed
      });

      if (preOrderItems && preOrderItems.length > 0) {
        // Fetch prices for preOrderItems to store in bookingItems
        const menuItemIds = preOrderItems.map(item => item.menuItemId);
        const itemsWithPrices = await tx.query.dbMenuItems.findMany({
            where: inArray(dbMenuItems.id, menuItemIds),
            columns: {id: true, price: true}
        });

        const bookingItemsToInsert = preOrderItems.map(item => {
            const dbItem = itemsWithPrices.find(pItem => pItem.id === item.menuItemId);
            return {
                id: uuidv4(),
                bookingId,
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: dbItem?.price || 0, // Store price at time of booking, handle if somehow not found
            };
        });
        await tx.insert(bookingItems).values(bookingItemsToInsert);
      }
    });

    return NextResponse.json({ success: true, bookingId }, { status: 201 });

  } catch (error) {
    console.error("Error creating booking:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
