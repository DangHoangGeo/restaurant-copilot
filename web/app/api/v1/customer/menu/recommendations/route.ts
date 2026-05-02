import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const requestSchema = z.object({
  restaurantId: z.string().uuid(),
  timeOfDay: z.enum(["breakfast", "lunch", "afternoon", "dinner", "late"]),
  timezone: z.string().min(1).max(80).optional().default("Asia/Tokyo"),
  guestCount: z.number().int().min(1).max(20).optional().default(1),
  currentCartItems: z.array(z.string().uuid()).optional().default([]),
  availableMenuItems: z
    .array(
      z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()).optional().default([]),
        prep_station: z.enum(["food", "drink", "other"]).optional(),
      }),
    )
    .max(250),
});

const timeTags: Record<string, string[]> = {
  breakfast: ["breakfast", "morning", "coffee", "quick"],
  lunch: ["lunch", "set_menu", "main_dish", "quick", "best_seller"],
  afternoon: ["afternoon", "snack", "drink", "dessert", "coffee"],
  dinner: ["dinner", "set_menu", "main_dish", "sharing", "best_seller"],
  late: ["late", "snack", "drink", "dessert", "quick"],
};

const timeHours: Record<string, { start: number; end: number }> = {
  breakfast: { start: 6, end: 11 },
  lunch: { start: 11, end: 15 },
  afternoon: { start: 15, end: 17 },
  dinner: { start: 17, end: 22 },
  late: { start: 22, end: 6 },
};

function normalizeTags(tags: string[]) {
  return new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
}

function hourMatchesWindow(hour: number, window: { start: number; end: number }) {
  if (window.start < window.end) {
    return hour >= window.start && hour < window.end;
  }

  return hour >= window.start || hour < window.end;
}

function getHourInTimezone(value: string, timezone: string) {
  try {
    const hourPart = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    })
      .formatToParts(new Date(value))
      .find((part) => part.type === "hour");
    const hour = Number(hourPart?.value);
    return Number.isFinite(hour) ? hour % 24 : new Date(value).getHours();
  } catch {
    return new Date(value).getHours();
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recommendation request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    restaurantId,
    timeOfDay,
    timezone,
    guestCount,
    currentCartItems,
    availableMenuItems,
  } = parsed.data;

  if (availableMenuItems.length === 0) {
    return NextResponse.json({
      items: [],
      reasons: {},
      confidence: 0,
      categories: ["empty"],
    });
  }

  const availableIds = new Set(availableMenuItems.map((item) => item.id));
  const cartIds = new Set(currentCartItems);
  const scores = new Map<string, { score: number; reasons: string[] }>();
  const matchingTags = new Set(timeTags[timeOfDay] ?? []);

  for (const item of availableMenuItems) {
    const tags = normalizeTags(item.tags);
    let score = 0;
    const reasons: string[] = [];

    for (const tag of matchingTags) {
      if (tags.has(tag)) {
        score += tag === "best_seller" ? 4 : 3;
        reasons.push(tag);
      }
    }

    if (guestCount >= 4 && (tags.has("sharing") || tags.has("set_menu"))) {
      score += 4;
      reasons.push("group");
    }

    if (item.prep_station === "drink" && ["afternoon", "late"].includes(timeOfDay)) {
      score += 1;
      reasons.push("drink");
    }

    if (cartIds.has(item.id)) {
      score -= 4;
    }

    scores.set(item.id, { score, reasons });
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data: recentOrders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("id, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "completed")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(600);

  if (ordersError) {
    console.error("Failed to load recommendation orders:", ordersError);
  }

  const mealWindow = timeHours[timeOfDay];
  const matchingOrderIds = (recentOrders ?? [])
    .filter((order) => {
      const hour = getHourInTimezone(order.created_at as string, timezone);
      return hourMatchesWindow(hour, mealWindow);
    })
    .map((order) => order.id as string);

  if (matchingOrderIds.length > 0) {
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .select("menu_item_id, quantity")
      .eq("restaurant_id", restaurantId)
      .in("order_id", matchingOrderIds)
      .neq("status", "canceled")
      .limit(1000);

    if (orderItemsError) {
      console.error("Failed to load recommendation order items:", orderItemsError);
    }

    for (const row of orderItems ?? []) {
      const itemId = row.menu_item_id as string;
      if (!availableIds.has(itemId)) continue;

      const current = scores.get(itemId) ?? { score: 0, reasons: [] };
      current.score += Math.min(Number(row.quantity ?? 0), 6);
      current.reasons.push("time_best_seller");
      scores.set(itemId, current);
    }
  }

  const ranked = Array.from(scores.entries())
    .filter(([, value]) => value.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8);

  return NextResponse.json({
    items: ranked.map(([itemId]) => itemId),
    reasons: Object.fromEntries(
      ranked.map(([itemId, value]) => [
        itemId,
        Array.from(new Set(value.reasons)).join(","),
      ]),
    ),
    confidence: matchingOrderIds.length > 0 ? 0.86 : 0.72,
    categories: matchingOrderIds.length > 0
      ? ["tags", "time_window_sales", "guest_count"]
      : ["tags", "guest_count"],
  });
}
