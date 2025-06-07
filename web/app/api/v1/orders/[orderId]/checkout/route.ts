import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";

export async function POST(req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
	  console.error("Unauthorized access attempt",req.url);
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    // Verify the order exists and belongs to the restaurant
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total_amount")
      .eq("id", orderId)
      .eq("restaurant_id", user.restaurantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "completed" || order.status === "canceled") {
      return NextResponse.json(
        { success: false, error: "Order already processed" },
        { status: 400 }
      );
    }

    // Mark all order items as served
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .update({ status: "served" })
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Error updating order items:", itemsError);
      return NextResponse.json(
        { success: false, error: "Failed to update order items" },
        { status: 500 }
      );
    }

    // Update order status to completed
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ 
        status: "completed",
        // You could add a checkout_at timestamp here if needed
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error completing order:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to complete order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      total: order.total_amount 
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}