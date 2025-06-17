// File: app/api/public/session-info/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
   const sessionId = req.nextUrl.searchParams.get("sessionId");
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true, order: data })
  } catch (err) {
    console.error('RPC error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
