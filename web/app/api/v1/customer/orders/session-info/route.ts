import { NextRequest, NextResponse } from 'next/server'
import { getCustomerSessionInfo } from '@/lib/server/customer-session';

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
    const order = await getCustomerSessionInfo({
      sessionId,
      restaurantId,
    });

    return NextResponse.json({ success: true, order })
  } catch (err) {
    console.error('RPC error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
