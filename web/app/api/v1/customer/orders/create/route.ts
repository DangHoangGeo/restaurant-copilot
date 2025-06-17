import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings";
import { getSubdomainFromHost } from "@/lib/utils";
import { logger, startPerformanceTimer, endPerformanceTimer } from "@/lib/logger";

const orderSchema = z.object({
  restaurantId: z.string().uuid().optional(), // Optional for validation, but will be derived from session
  sessionId: z.string().uuid(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
      menu_item_size_id: z.string().uuid().optional(),
      topping_ids: z.array(z.string().uuid()).optional(),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const requestId = `order-create-${Date.now()}-${Math.random()}`;
  startPerformanceTimer(requestId);
  
  const body = await req.json();
  const parse = orderSchema.safeParse(body);
  if (!parse.success) {
    await logger.error('orders-create-api', 'Order validation failed', {
      error: parse.error.errors,
      body
    });
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }

  const { sessionId, items } = parse.data;
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  const restaurantId = parse.data.restaurantId ? parse.data.restaurantId :  subdomain? await getRestaurantIdFromSubdomain(subdomain) : null;
  if (!restaurantId) {
    return NextResponse.json({ success: false, error: "Invalid restaurant" }, { status: 400 });
  }

  // Check if there's an existing active order for this session
  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("id,status,total_amount")
    .eq("session_id", sessionId)
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "serving"]) // Allow adding items to orders that are new or serving
    .single();
    
  if (!orderRow) {
    return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
  }

  let totalAmount = Number(orderRow.total_amount) || 0;
  const orderItemsData = [];

  for (const orderItem of items) {
    const { menuItemId, quantity, menu_item_size_id, topping_ids, notes } = orderItem;

    const { data: menuItem }: { data: { price: number; available: boolean; weekday_visibility: number[]; restaurant_id: string } | null } = await supabaseAdmin
      .from("menu_items")
      .select("price,available,weekday_visibility, restaurant_id") // Ensure restaurant_id is fetched for validation
      .eq("id", menuItemId)
      .eq("restaurant_id", restaurantId) // Validate against the session's restaurantId
      .single();

    if (!menuItem || !menuItem.available) {
      return NextResponse.json({ success: false, error: `Item ${menuItemId} unavailable` }, { status: 400 });
    }
    // Validate restaurant_id coherence (though already filtered in query)
    if (menuItem.restaurant_id !== restaurantId) {
        return NextResponse.json({ success: false, error: `Item ${menuItemId} does not belong to restaurant ${restaurantId}` }, { status: 400 });
    }

    const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
    if (!menuItem.weekday_visibility.includes(todayWeekday)) {
      return NextResponse.json({ success: false, error: `Item ${menuItemId} not available today` }, { status: 400 });
    }

    let currentItemPrice = Number(menuItem.price);

    if (menu_item_size_id) {
      const { data: sizeInfo }: { data: { price: number; menu_item_id: string; restaurant_id: string } | null } = await supabaseAdmin
        .from("menu_item_sizes")
        .select("price, menu_item_id, restaurant_id")
        .eq("id", menu_item_size_id)
        .eq("menu_item_id", menuItemId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (!sizeInfo) {
        return NextResponse.json({ success: false, error: `Invalid size ${menu_item_size_id} for item ${menuItemId}` }, { status: 400 });
      }
      // Ensure size actually belongs to the item and restaurant (redundant if query is structured well, but good for safety)
      if (sizeInfo.menu_item_id !== menuItemId || sizeInfo.restaurant_id !== restaurantId) {
        return NextResponse.json({ success: false, error: `Size ${menu_item_size_id} mismatch for item ${menuItemId} at restaurant ${restaurantId}` }, { status: 400 });
      }
      currentItemPrice = Number(sizeInfo.price);
    }

    let additionalToppingsPrice = 0;
    if (topping_ids && topping_ids.length > 0) {
      const { data: toppingsInfo, error: toppingsError }: { data: { price: number; menu_item_id: string; restaurant_id: string }[] | null; error: unknown } = await supabaseAdmin
        .from("toppings")
        .select("price, menu_item_id, restaurant_id")
        .in("id", topping_ids)
        .eq("menu_item_id", menuItemId) // Ensure toppings belong to the current menu item
        .eq("restaurant_id", restaurantId); // Ensure toppings belong to the current restaurant

      if (toppingsError || !toppingsInfo || toppingsInfo.length !== topping_ids.length) {
        return NextResponse.json({ success: false, error: `Invalid topping IDs for item ${menuItemId}` }, { status: 400 });
      }

      for (const topping of toppingsInfo) {
        // Double check each topping belongs to the item and restaurant
        if (topping.menu_item_id !== menuItemId || topping.restaurant_id !== restaurantId) {
            return NextResponse.json({ success: false, error: `Topping mismatch for item ${menuItemId} at restaurant ${restaurantId}` }, { status: 400 });
        }
        additionalToppingsPrice += Number(topping.price);
      }
    }

    totalAmount += (currentItemPrice + additionalToppingsPrice) * quantity;

    orderItemsData.push({
      restaurant_id: restaurantId,
      // order_id will be set after order update/creation
      menu_item_id: menuItemId,
      quantity,
      notes,
      menu_item_size_id: menu_item_size_id || null,
      topping_ids: topping_ids || null,
      // Price for this specific configuration at the time of order, per unit
      price_at_order: currentItemPrice + additionalToppingsPrice,
    });
  }

  const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
    .from("orders")
    .update({ total_amount: totalAmount, status: "serving" }) // Update status here as well
    .eq("id", orderRow.id) // Use orderRow.id directly
    .select("id")
    .single();

  if (orderUpdateError || !updatedOrder) {
    await logger.error('orders-create-api', 'Order update failed', {
      error: orderUpdateError?.message,
      orderId: orderRow.id,
      restaurantId
    }, restaurantId);
    return NextResponse.json({ success: false, error: "Order update failed" }, { status: 500 });
  }
  const orderId = updatedOrder.id;

  // Update order_id for all items and insert them
  const itemsToInsert = orderItemsData.map(item => ({ ...item, order_id: orderId }));
  const { error: insertItemsError } = await supabaseAdmin
    .from("order_items")
    .insert(itemsToInsert);

  if (insertItemsError) {
    await logger.error('orders-create-api', 'Failed to insert order items', {
      error: insertItemsError.message,
      orderId,
      itemCount: itemsToInsert.length,
      restaurantId
    }, restaurantId);
    // Potentially roll back order update or handle inconsistency
    return NextResponse.json({ success: false, error: "Failed to save order items" }, { status: 500 });
  }

  // Update order status to 'preparing' after items are added - This is now part of the main order update
  await endPerformanceTimer(requestId, 'orders-create-api', restaurantId);
  return NextResponse.json({ success: true, orderId });
}
