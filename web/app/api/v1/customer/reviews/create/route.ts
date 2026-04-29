import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings";
import { getSubdomainFromHost } from "@/lib/utils";
import { z } from "zod";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

const reviewSchema = z.object({
  menuItemId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.MUTATION,
      "customer-reviews-create",
    );
    if (protectionError) {
      return protectionError;
    }

    const body = await req.json();
    const parse = reviewSchema.safeParse(body);
    
    if (!parse.success) {
      return NextResponse.json({ 
        success: false, 
        errors: parse.error.errors 
      }, { status: 400 });
    }

    const { menuItemId, orderId, rating, comment } = parse.data;

    // Get restaurant ID from subdomain
    const host = req.headers.get("host") || "";
    const subdomain = getSubdomainFromHost(host);
    const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

    if (!restaurantId) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid restaurant" 
      }, { status: 400 });
    }

    // Verify the order exists and belongs to this restaurant
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid order" 
      }, { status: 404 });
    }

    // Verify the menu item exists and belongs to this restaurant
    const { data: menuItem, error: menuItemError } = await supabaseAdmin
      .from("menu_items")
      .select("id, restaurant_id")
      .eq("id", menuItemId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (menuItemError || !menuItem) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid menu item" 
      }, { status: 404 });
    }

    // Check if review already exists for this order and menu item
    const { data: existingReview } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("menu_item_id", menuItemId)
      .single();

    if (existingReview) {
      return NextResponse.json({ 
        success: false, 
        error: "Review already exists for this item in this order" 
      }, { status: 409 });
    }

    // Create the review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from("reviews")
      .insert([{
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        order_id: orderId,
        rating,
        comment: comment || null,
        status: "pending"
      }])
      .select("id")
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create review" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      reviewId: review.id 
    });

  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}