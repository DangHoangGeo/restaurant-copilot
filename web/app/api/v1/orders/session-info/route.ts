// File: app/api/public/session-info/route.ts

import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSubdomainFromHost } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionId    = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
	return NextResponse.json(
	  { success: false, error: 'sessionId is required' },
	  { status: 400 }
	)
  }
// Get restaurant ID from subdomain
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomainFromHost(host) || req.nextUrl.searchParams.get("subdomain");
  const restaurantId = subdomain ? await getRestaurantIdFromSubdomain(subdomain) : null;

  if (!sessionId || !restaurantId) {
    return NextResponse.json(
      { success: false, error: 'sessionId and restaurantId are required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_order_session_info', {
        p_session_id:    sessionId,
        p_restaurant_id: restaurantId
      })

    if (error) {
      // 404 for “not found” or other client errors
      const status = error.code === 'PGRST100' ? 404 : 500
      return NextResponse.json(
        { success: false, error: error.message },
        { status }
      )
    }

    return NextResponse.json({ success: true, orders: data })
  } catch (err) {
    console.error('RPC error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
