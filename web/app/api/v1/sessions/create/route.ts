import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { randomUUID } from "crypto";
import { getRestaurantIdFromSubdomain } from "../../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../../lib/utils";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("tableId");
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;
  if (!tableId || !restaurantId) {
    return NextResponse.json({ error: "Invalid table" }, { status: 404 });
  }

  const { data: table } = await supabaseAdmin
    .from("tables")
    .select("id")
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (!table) {
    return NextResponse.json({ error: "Invalid table" }, { status: 404 });
  }
  const sessionId = randomUUID();
  await supabaseAdmin.from("orders").insert([
    { restaurant_id: restaurantId, table_id: table.id, session_id: sessionId, status: "new" },
  ]);

  return NextResponse.json({ sessionId });
}
