// Promotions domain service layer — Phase 7.
// Route handlers call these functions, not the queries module directly.
//
// Key invariants:
//  - restaurant_id always comes from the authenticated session or verified context.
//  - Code validation checks is_active, date range, usage limits, and min order amount.
//  - One discount per order is enforced: applyPromo returns 409 if already applied.
//  - Deletion is blocked if usage_count > 0 (use disable instead).
//  - orders.total_amount stays as gross amount; discount is tracked separately in
//    order_discounts — never an untracked price edit.

import { getJapanLocalDate } from '@/lib/server/attendance/service';
import {
  getPromotionByCode,
  getPromotionById,
  listPromotions,
  insertPromotion,
  patchPromotion,
  removePromotion,
  incrementUsageCount,
  insertOrderDiscount,
  getOrderDiscountByOrderId,
  listOrderDiscountsByPromotion,
} from './queries';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Promotion, OrderDiscount, ValidationResult } from './types';
import type { CreatePromotionInput, UpdatePromotionInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Compute the monetary discount amount for a given promotion + order total. */
function computeDiscountAmount(promo: Promotion, orderAmount: number): number {
  if (promo.discount_type === 'flat') {
    return Math.min(promo.discount_value, orderAmount);
  }
  // percentage
  const raw = (promo.discount_value / 100) * orderAmount;
  const capped = promo.max_discount_amount !== null
    ? Math.min(raw, promo.max_discount_amount)
    : raw;
  return parseFloat(capped.toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner-facing operations
// ─────────────────────────────────────────────────────────────────────────────

export async function getPromotionList(
  restaurantId: string,
  includeInactive = false
): Promise<Promotion[]> {
  return listPromotions(restaurantId, includeInactive);
}

export async function getPromotion(
  restaurantId: string,
  promoId: string
): Promise<Promotion | null> {
  return getPromotionById(restaurantId, promoId);
}

export async function createPromotion(
  restaurantId: string,
  input: CreatePromotionInput,
  userId: string
): Promise<Promotion> {
  return insertPromotion(restaurantId, input, userId);
}

export async function modifyPromotion(
  restaurantId: string,
  promoId: string,
  input: UpdatePromotionInput
): Promise<Promotion> {
  const existing = await getPromotionById(restaurantId, promoId);
  if (!existing) {
    throw Object.assign(new Error('Promotion not found'), { status: 404 });
  }
  return patchPromotion(restaurantId, promoId, input);
}

/**
 * Hard-delete a promotion. Blocked if the promotion has been used at least once.
 * To stop new uses, disable via modifyPromotion({ is_active: false }) instead.
 */
export async function deletePromotion(
  restaurantId: string,
  promoId: string
): Promise<void> {
  const existing = await getPromotionById(restaurantId, promoId);
  if (!existing) {
    throw Object.assign(new Error('Promotion not found'), { status: 404 });
  }
  if (existing.usage_count > 0) {
    throw Object.assign(
      new Error('Cannot delete a promotion that has been used. Disable it instead.'),
      { status: 409 }
    );
  }
  return removePromotion(restaurantId, promoId);
}

export async function getPromotionUsage(
  restaurantId: string,
  promoId: string,
  limit = 50
): Promise<OrderDiscount[]> {
  const existing = await getPromotionById(restaurantId, promoId);
  if (!existing) {
    throw Object.assign(new Error('Promotion not found'), { status: 404 });
  }
  return listOrderDiscountsByPromotion(restaurantId, promoId, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer-facing operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a promo code without applying it.
 * Returns the computed discount amount and any validity error.
 */
export async function validatePromo(
  restaurantId: string,
  code: string,
  orderAmount: number
): Promise<ValidationResult> {
  const promo = await getPromotionByCode(restaurantId, code);

  if (!promo) {
    return { valid: false, promotion: null, discount_amount: 0, error: 'Promo code not found' };
  }
  if (!promo.is_active) {
    return { valid: false, promotion: promo, discount_amount: 0, error: 'Promo code is no longer active' };
  }

  const today = getJapanLocalDate(); // YYYY-MM-DD
  if (promo.valid_from && today < promo.valid_from) {
    return { valid: false, promotion: promo, discount_amount: 0, error: 'Promo code is not yet valid' };
  }
  if (promo.valid_until && today > promo.valid_until) {
    return { valid: false, promotion: promo, discount_amount: 0, error: 'Promo code has expired' };
  }
  if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) {
    return { valid: false, promotion: promo, discount_amount: 0, error: 'Promo code usage limit reached' };
  }
  if (promo.min_order_amount !== null && orderAmount < promo.min_order_amount) {
    return {
      valid: false,
      promotion: promo,
      discount_amount: 0,
      error: `Minimum order amount is ${promo.min_order_amount}`,
    };
  }

  const discount_amount = computeDiscountAmount(promo, orderAmount);
  return { valid: true, promotion: promo, discount_amount };
}

/**
 * Apply a promo code to an order.
 * Verifies the session owns the order, validates the code, records the
 * order_discount, and increments usage_count.
 * Throws 409 if a discount is already applied to this order.
 */
export async function applyPromo(params: {
  restaurantId: string;
  orderId: string;
  sessionId: string;
  code: string;
  currency: string;
}): Promise<{ discount_amount: number; promotion_code: string }> {
  const { restaurantId, orderId, sessionId, code, currency } = params;

  // Verify order belongs to this session + restaurant and is still open
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, total_amount, status')
    .eq('id', orderId)
    .eq('session_id', sessionId)
    .eq('restaurant_id', restaurantId)
    .in('status', ['new', 'serving'])
    .maybeSingle();

  if (!order) {
    throw Object.assign(
      new Error('Order not found or session does not match'),
      { status: 404 }
    );
  }

  // One discount per order
  const existing = await getOrderDiscountByOrderId(restaurantId, orderId);
  if (existing) {
    throw Object.assign(
      new Error('A discount has already been applied to this order'),
      { status: 409 }
    );
  }

  const orderAmount = order.total_amount ?? 0;
  const result = await validatePromo(restaurantId, code, orderAmount);
  if (!result.valid || !result.promotion) {
    throw Object.assign(new Error(result.error ?? 'Invalid promo code'), { status: 422 });
  }

  const promo = result.promotion;

  // Record the discount
  await insertOrderDiscount({
    restaurant_id:     restaurantId,
    order_id:          orderId,
    order_created_at:  order.created_at,
    promotion_id:      promo.id,
    promotion_code:    promo.code,
    discount_type:     promo.discount_type,
    discount_value:    promo.discount_value,
    discount_amount:   result.discount_amount,
    currency,
    applied_by_session: sessionId,
  });

  // Increment usage counter
  await incrementUsageCount(promo.id);

  return { discount_amount: result.discount_amount, promotion_code: promo.code };
}
