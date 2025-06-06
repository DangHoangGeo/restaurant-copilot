import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { z } from "zod";
import { getRestaurantIdFromSubdomain } from "../../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../../lib/utils";

const orderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = orderSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const { sessionId, items } = parse.data;
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;
  if (!restaurantId) {
    return NextResponse.json({ success: false, error: "Invalid restaurant" }, { status: 400 });
  }

  const { data: orderRow } = await supabaseAdmin
    .from("orders")
    .select("id,status")
    .eq("session_id", sessionId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (!orderRow || orderRow.status !== "new") {
    return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 400 });
  }

  let totalAmount = 0;
  for (const { menuItemId, quantity } of items) {
    const { data: item } = await supabaseAdmin
      .from("menu_items")
      .select("price,available,weekday_visibility")
      .eq("id", menuItemId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!item || !item.available) {
      return NextResponse.json({ success: false, error: "Item unavailable" }, { status: 400 });
    }
    const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
    if (!item.weekday_visibility.includes(todayWeekday)) {
      return NextResponse.json({ success: false, error: "Item not available today" }, { status: 400 });
    }
    totalAmount += Number(item.price) * quantity;
  }

  const { data: updatedOrder } = await supabaseAdmin
    .from("orders")
    .update({ total_amount: totalAmount })
    .eq("session_id", sessionId)
    .select("id")
    .single();
  const orderId = updatedOrder?.id;
  if (!orderId) {
    return NextResponse.json({ success: false, error: "Order update failed" }, { status: 500 });
  }

  for (const { menuItemId, quantity, notes } of items) {
    await supabaseAdmin.from("order_items").insert([
      {
        restaurant_id: restaurantId,
        order_id: orderId,
        menu_item_id: menuItemId,
        quantity,
        notes,
      },
    ]);
  }

  return NextResponse.json({ success: true, orderId });
}
