import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const updateOrderStatusSchema = z.object({
  status: z.enum(["new", "preparing", "ready", "completed", "canceled"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await req.json();
    const validatedData = updateOrderStatusSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const { status } = validatedData.data;

    // Verify the order belongs to the user's restaurant
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id")
      .eq("id", orderId)
      .eq("restaurant_id", user.restaurantId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Update the order status
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("restaurant_id", user.restaurantId);

    if (updateError) {
      console.error("Error updating order status:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in order status update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}