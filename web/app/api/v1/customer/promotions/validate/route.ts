// POST /api/v1/customer/promotions/validate
//
// Preview what discount a promo code would give for a given order amount.
// This does NOT apply the discount — it is a read-only check.
//
// Body: { code, order_amount, restaurant_id }
// Returns: { valid, discount_amount, promotion_code?, description?, error? }
//
// No authentication required (customer-facing public endpoint).

import { NextRequest, NextResponse } from 'next/server';
import { ValidatePromoSchema } from '@/lib/server/promotions/schemas';
import { validatePromo } from '@/lib/server/promotions/service';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ValidatePromoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { restaurant_id, code, order_amount } = parsed.data;

  try {
    const result = await validatePromo(restaurant_id, code, order_amount);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, discount_amount: 0, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      valid: true,
      discount_amount:  result.discount_amount,
      promotion_code:   result.promotion?.code,
      description:      result.promotion?.description ?? null,
      discount_type:    result.promotion?.discount_type,
      discount_value:   result.promotion?.discount_value,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
