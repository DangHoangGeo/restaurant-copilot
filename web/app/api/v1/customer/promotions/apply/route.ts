// POST /api/v1/customer/promotions/apply
//
// Apply a promo code to an open order.
// Validates the code, records an order_discount, and increments usage_count.
// orders.total_amount is NOT modified — discount is tracked separately in
// order_discounts so the finance layer can compute gross vs. discounted sales.
//
// Body: { code, order_id, session_id, restaurant_id, currency? }
// Returns: { success, discount_amount, promotion_code }
//
// No authentication required; session_id acts as the customer credential.

import { NextRequest, NextResponse } from 'next/server';
import { ApplyPromoSchema } from '@/lib/server/promotions/schemas';
import { applyPromo } from '@/lib/server/promotions/service';
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings';
import { getSubdomainFromHost } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Allow restaurant_id to come from subdomain as a fallback
  if (!body.restaurant_id) {
    const host = req.headers.get('host') || '';
    const subdomain = getSubdomainFromHost(host);
    if (subdomain) {
      body.restaurant_id = await getRestaurantIdFromSubdomain(subdomain);
    }
  }

  const parsed = ApplyPromoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { restaurant_id, order_id, session_id, code, currency } = parsed.data;

  try {
    const result = await applyPromo({
      restaurantId: restaurant_id,
      orderId:      order_id,
      sessionId:    session_id,
      code,
      currency,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'Failed to apply promo';
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
