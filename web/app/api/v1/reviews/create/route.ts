import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reviews, menuItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRestaurantIdFromMiddleware } from "@/lib/utils/apiUtils"; // Assuming this utility exists
import { v4 as uuidv4 } from "uuid";

// Zod schema for request validation
const CreateReviewSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID."),
  rating: z.number().min(1, "Rating must be at least 1.").max(5, "Rating cannot exceed 5."),
  comment: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const restaurantId = await getRestaurantIdFromMiddleware();
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized or restaurantId not found" }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request payload", details: validation.error.flatten() }, { status: 400 });
    }

    const { menuItemId, rating, comment } = validation.data;

    // 1. Verify menuItemId belongs to the restaurantId
    const menuItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, menuItemId),
        eq(menuItems.restaurantId, restaurantId)
      ),
      columns: { id: true } // Only need to check for existence
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found or does not belong to this restaurant." }, { status: 404 });
    }

    // 2. Insert into reviews table
    const reviewId = uuidv4();
    await db.insert(reviews).values({
      id: reviewId,
      restaurantId,
      menuItemId,
      // customerId: null, // TODO: Link to customer if logged in, for now anonymous
      rating,
      comment,
      createdAt: new Date(),
      // status: 'pending', // If moderation is needed, otherwise 'approved'
    });

    // Optionally, re-calculate average rating for the menu item (can be done asynchronously or via trigger)
    // For simplicity, not included here.

    return NextResponse.json({ success: true, reviewId }, { status: 201 });

  } catch (error) {
    console.error("Error creating review:", error);
    if (error instanceof z.ZodError) { // Should be caught by validation check, but good practice
      return NextResponse.json({ error: "Invalid request payload", details: error.flatten() }, { status: 400 });
    }
    // Consider more specific error handling based on potential DB errors (e.g., unique constraint violations)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
