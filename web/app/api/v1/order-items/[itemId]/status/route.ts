import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["ordered", "preparing", "ready", "served"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const body = await req.json();
    const validatedData = updateStatusSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const { status } = validatedData.data;

    // Verify the order item belongs to the user's restaurant
    const { data: orderItem, error: fetchError } = await supabaseAdmin
      .from("order_items")
      .select(
        `id, orders!inner(restaurant_id)`
      )
      .eq("id", itemId)
      .single();

    if (fetchError || !orderItem || (orderItem.orders as {restaurant_id: string}[])[0].restaurant_id !== user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Order item not found" },
        { status: 404 }
      );
    }

    // Update the order item status
    const { error: updateError } = await supabaseAdmin
      .from("order_items")
      .update({ status })
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating order item status:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in order item status update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}