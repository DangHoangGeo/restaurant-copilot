import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getRestaurantIdFromSubdomain } from "../../../../lib/server/restaurant-settings";
import { getSubdomainFromHost } from "../../../../lib/utils";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host) || req.nextUrl.searchParams.get("subdomain");
  const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

  if (!restaurantId) {
    return NextResponse.json({ error: "Invalid restaurant" }, { status: 400 });
  }

  // Look up table by secure code
  const { data: table, error: tableError } = await supabaseAdmin
    .from("tables")
    .select("id")
    .eq("code", code)
    .eq("restaurant_id", restaurantId)
    .single();

  if (tableError || !table) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  const tableId = table.id;

  // Check for active order session on this table
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("session_id,status")
    .eq("table_id", tableId)
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    tableId,
    restaurantId,
    activeSessionId: order?.session_id ?? undefined,
    requirePasscode: order?.session_id ? true : false,
  });
}
