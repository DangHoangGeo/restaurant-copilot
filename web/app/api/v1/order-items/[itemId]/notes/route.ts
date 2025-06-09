import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const updateNotesSchema = z.object({
  notes: z.string().nullable(),
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
    const validatedData = updateNotesSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid notes data" },
        { status: 400 }
      );
    }

    const { notes } = validatedData.data;

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

    // Update the order item notes
    const { error: updateError } = await supabaseAdmin
      .from("order_items")
      .update({ notes })
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating order item notes:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in order item notes update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}