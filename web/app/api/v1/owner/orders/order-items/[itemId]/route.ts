import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { z } from "zod";

const updateOrderItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["ordered", "preparing", "ready", "served"]).optional(),
  menu_item_size_id: z.string().uuid().nullable().optional(),
  topping_ids: z.array(z.string().uuid()).nullable().optional(),
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
    const validatedData = updateOrderItemSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validatedData.data;

    // Verify the order item belongs to the user's restaurant
    const { data: orderItem, error: fetchError } = await supabaseAdmin
      .from("order_items")
      .select(`
        id, 
        quantity, 
        price_at_order,
        order_id,
        menu_item_id,
        menu_item_size_id,
        topping_ids,
        orders!inner(id, restaurant_id, total_amount)
      `)
      .eq("id", itemId)
      .single();

    if (fetchError || !orderItem || (orderItem.orders as {restaurant_id: string}[])[0].restaurant_id !== user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Order item not found" },
        { status: 404 }
      );
    }

    // If quantity, size, or toppings are being updated, we need to recalculate the price
    let shouldRecalculatePrice = false;
    let newPriceAtOrder = orderItem.price_at_order;

    if (updates.quantity !== undefined || updates.menu_item_size_id !== undefined || updates.topping_ids !== undefined) {
      shouldRecalculatePrice = true;
      
      // Get the base menu item price
      const { data: menuItem, error: menuError } = await supabaseAdmin
        .from("menu_items")
        .select("price")
        .eq("id", orderItem.menu_item_id)
        .eq("restaurant_id", user.restaurantId)
        .single();

      if (menuError || !menuItem) {
        return NextResponse.json(
          { success: false, error: "Menu item not found" },
          { status: 404 }
        );
      }

      let itemPrice = menuItem.price;

      // Calculate size price if size is being updated or if there's already a size
      const sizeId = updates.menu_item_size_id !== undefined ? updates.menu_item_size_id : orderItem.menu_item_size_id;
      if (sizeId) {
        const { data: sizeData, error: sizeError } = await supabaseAdmin
          .from("menu_item_sizes")
          .select("price")
          .eq("id", sizeId)
          .eq("restaurant_id", user.restaurantId)
          .single();

        if (sizeError || !sizeData) {
          return NextResponse.json(
            { success: false, error: "Menu item size not found" },
            { status: 404 }
          );
        }

        itemPrice = sizeData.price; // Size price replaces base price
      }

      // Calculate toppings price if toppings are being updated or if there are already toppings
      const toppingIds = updates.topping_ids !== undefined ? updates.topping_ids : orderItem.topping_ids;
      if (toppingIds && toppingIds.length > 0) {
        const { data: toppingsData, error: toppingsError } = await supabaseAdmin
          .from("toppings")
          .select("price")
          .in("id", toppingIds)
          .eq("restaurant_id", user.restaurantId);

        if (toppingsError || !toppingsData) {
          return NextResponse.json(
            { success: false, error: "Invalid toppings specified" },
            { status: 404 }
          );
        }

        // Validate all toppings exist
        if (toppingsData.length !== toppingIds.length) {
          return NextResponse.json(
            { success: false, error: "Some toppings not found" },
            { status: 404 }
          );
        }

        const toppingsPrice = toppingsData.reduce((sum, topping) => sum + topping.price, 0);
        itemPrice += toppingsPrice;
      }

      newPriceAtOrder = itemPrice;
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (updates.quantity !== undefined) {
      updateData.quantity = updates.quantity;
    }
    
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }
    
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    
    if (updates.menu_item_size_id !== undefined) {
      updateData.menu_item_size_id = updates.menu_item_size_id;
    }
    
    if (updates.topping_ids !== undefined) {
      updateData.topping_ids = updates.topping_ids;
    }

    if (shouldRecalculatePrice) {
      updateData.price_at_order = newPriceAtOrder;
    }

    updateData.updated_at = new Date().toISOString();

    // Update the order item
    const { error: updateError } = await supabaseAdmin
      .from("order_items")
      .update(updateData)
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating order item:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update order item" },
        { status: 500 }
      );
    }

    // If quantity was updated or price was recalculated, recalculate order total
    if ((updates.quantity && updates.quantity !== orderItem.quantity) || shouldRecalculatePrice) {
      const oldItemTotal = orderItem.quantity * (orderItem.price_at_order || 0);
      const newQuantity = updates.quantity || orderItem.quantity;
      const newItemTotal = newQuantity * newPriceAtOrder;
      const totalDiff = newItemTotal - oldItemTotal;
      
      const order = (orderItem.orders as {total_amount: number}[])[0];
      const newOrderTotal = (order.total_amount || 0) + totalDiff;

      await supabaseAdmin
        .from("orders")
        .update({ 
          total_amount: newOrderTotal,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderItem.order_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in order item update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
