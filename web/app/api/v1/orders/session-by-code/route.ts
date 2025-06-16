import { NextRequest, NextResponse } from "next/server";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings";
import { getSubdomainFromHost } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
  }

  // Get restaurant ID from subdomain
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host) || req.nextUrl.searchParams.get("subdomain");
  const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_table_session_by_code', {
        input_code: code,
        input_restaurant_id: restaurantId
      })
      

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No table found for this code' }, { status: 404 })
    }

    const row = data[0]

    return NextResponse.json({
      tableId: row.table_id,
      restaurantId: row.restaurant_id,
      activeSessionId: row.active_session_id ?? null,
      requirePasscode: row.require_passcode,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
