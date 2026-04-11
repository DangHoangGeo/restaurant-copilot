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
    console.log('Order validation errors:', parse.error.errors);
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
    .in("status", ["new", "serving"])
    .single();

  if (!orderRow) {
    return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // Batch-fetch all required data upfront to avoid N+1 queries inside the loop
  // -------------------------------------------------------------------------
  const menuItemIds = items.map((i) => i.menuItemId);
  const sizeIds = items.map((i) => i.menu_item_size_id).filter((id): id is string => !!id);
  const allToppingIds = items.flatMap((i) => i.topping_ids ?? []);

  // Three parallel queries instead of up to (3 × N) sequential queries
  const [menuItemsRes, sizesRes, toppingsRes] = await Promise.all([
    supabaseAdmin
      .from("menu_items")
      .select("id, price, available, weekday_visibility, restaurant_id")
      .in("id", menuItemIds)
      .eq("restaurant_id", restaurantId),
    sizeIds.length > 0
      ? supabaseAdmin
          .from("menu_item_sizes")
          .select("id, price, menu_item_id, restaurant_id")
          .in("id", sizeIds)
          .eq("restaurant_id", restaurantId)
      : Promise.resolve({ data: [], error: null }),
    allToppingIds.length > 0
      ? supabaseAdmin
          .from("toppings")
          .select("id, price, menu_item_id, restaurant_id")
          .in("id", allToppingIds)
          .eq("restaurant_id", restaurantId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (menuItemsRes.error) {
    return NextResponse.json({ success: false, error: "Failed to validate menu items" }, { status: 500 });
  }

  type MenuItemRow = { id: string; price: number; available: boolean; weekday_visibility: number[]; restaurant_id: string };
  type SizeRow = { id: string; price: number; menu_item_id: string; restaurant_id: string };
  type ToppingRow = { id: string; price: number; menu_item_id: string; restaurant_id: string };

  const menuItemMap = new Map<string, MenuItemRow>(
    (menuItemsRes.data as MenuItemRow[]).map((m) => [m.id, m])
  );
  const sizeMap = new Map<string, SizeRow>(
    ((sizesRes.data ?? []) as SizeRow[]).map((s) => [s.id, s])
  );
  const toppingMap = new Map<string, ToppingRow>(
    ((toppingsRes.data ?? []) as ToppingRow[]).map((t) => [t.id, t])
  );

  const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
  let totalAmount = Number(orderRow.total_amount) || 0;
  const orderItemsData = [];

  for (const orderItem of items) {
    const { menuItemId, quantity, menu_item_size_id, topping_ids, notes } = orderItem;

    const menuItem = menuItemMap.get(menuItemId);
    if (!menuItem || !menuItem.available) {
      return NextResponse.json({ success: false, error: `Item ${menuItemId} unavailable` }, { status: 400 });
    }
    if (!menuItem.weekday_visibility.includes(todayWeekday)) {
      return NextResponse.json({ success: false, error: `Item ${menuItemId} not available today` }, { status: 400 });
    }

    let currentItemPrice = Number(menuItem.price);

    if (menu_item_size_id) {
      const sizeInfo = sizeMap.get(menu_item_size_id);
      if (!sizeInfo || sizeInfo.menu_item_id !== menuItemId || sizeInfo.restaurant_id !== restaurantId) {
        return NextResponse.json({ success: false, error: `Invalid size ${menu_item_size_id} for item ${menuItemId}` }, { status: 400 });
      }
      currentItemPrice = Number(sizeInfo.price);
    }

    let additionalToppingsPrice = 0;
    if (topping_ids && topping_ids.length > 0) {
      for (const toppingId of topping_ids) {
        const topping = toppingMap.get(toppingId);
        if (!topping || topping.menu_item_id !== menuItemId || topping.restaurant_id !== restaurantId) {
          return NextResponse.json({ success: false, error: `Invalid topping IDs for item ${menuItemId}` }, { status: 400 });
        }
        additionalToppingsPrice += Number(topping.price);
      }
    }

    totalAmount += (currentItemPrice + additionalToppingsPrice) * quantity;

    orderItemsData.push({
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      quantity,
      notes,
      menu_item_size_id: menu_item_size_id || null,
      topping_ids: topping_ids || null,
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
