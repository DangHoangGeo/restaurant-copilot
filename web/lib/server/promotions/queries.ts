// Promotions domain — raw database queries for Phase 7.
// Route handlers call service functions; avoid calling these directly from routes.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Promotion, OrderDiscount } from './types';
import type { CreatePromotionInput, UpdatePromotionInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Promotions CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getPromotionByCode(
  restaurantId: string,
  code: string
): Promise<Promotion | null> {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();

  if (error) throw new Error(`getPromotionByCode: ${error.message}`);
  return data as Promotion | null;
}

export async function getPromotionById(
  restaurantId: string,
  promoId: string
): Promise<Promotion | null> {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('id', promoId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getPromotionById: ${error.message}`);
  return data as Promotion | null;
}

export async function listPromotions(
  restaurantId: string,
  includeInactive = false
): Promise<Promotion[]> {
  let query = supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listPromotions: ${error.message}`);
  return (data ?? []) as Promotion[];
}

export async function insertPromotion(
  restaurantId: string,
  input: CreatePromotionInput,
  createdBy: string | null
): Promise<Promotion> {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .insert({
      restaurant_id:       restaurantId,
      code:                input.code.toUpperCase().trim(),
      description:         input.description ?? null,
      discount_type:       input.discount_type,
      discount_value:      input.discount_value,
      min_order_amount:    input.min_order_amount ?? null,
      max_discount_amount: input.max_discount_amount ?? null,
      valid_from:          input.valid_from ?? null,
      valid_until:         input.valid_until ?? null,
      usage_limit:         input.usage_limit ?? null,
      created_by:          createdBy,
    })
    .select('*')
    .single();

  if (error) throw new Error(`insertPromotion: ${error.message}`);
  return data as Promotion;
}

export async function patchPromotion(
  restaurantId: string,
  promoId: string,
  input: UpdatePromotionInput
): Promise<Promotion> {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', promoId)
    .eq('restaurant_id', restaurantId)
    .select('*')
    .single();

  if (error) throw new Error(`patchPromotion: ${error.message}`);
  return data as Promotion;
}

export async function removePromotion(
  restaurantId: string,
  promoId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('promotions')
    .delete()
    .eq('id', promoId)
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(`removePromotion: ${error.message}`);
}

export async function incrementUsageCount(promoId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('promotions')
    .select('usage_count')
    .eq('id', promoId)
    .single();

  if (data) {
    await supabaseAdmin
      .from('promotions')
      .update({ usage_count: (data.usage_count ?? 0) + 1 })
      .eq('id', promoId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order discounts
// ─────────────────────────────────────────────────────────────────────────────

export async function insertOrderDiscount(
  discount: Omit<OrderDiscount, 'id' | 'applied_at'>
): Promise<OrderDiscount> {
  const { data, error } = await supabaseAdmin
    .from('order_discounts')
    .insert(discount)
    .select('*')
    .single();

  if (error) {
    if ('code' in error && error.code === '23505') {
      throw Object.assign(
        new Error('A discount has already been applied to this order'),
        { status: 409 }
      );
    }
    throw new Error(`insertOrderDiscount: ${error.message}`);
  }
  return data as OrderDiscount;
}

export async function getOrderDiscountByOrderId(
  restaurantId: string,
  orderId: string
): Promise<OrderDiscount | null> {
  const { data, error } = await supabaseAdmin
    .from('order_discounts')
    .select('*')
    .eq('order_id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getOrderDiscountByOrderId: ${error.message}`);
  return data as OrderDiscount | null;
}

export async function listOrderDiscountsByPromotion(
  restaurantId: string,
  promotionId: string,
  limit = 50
): Promise<OrderDiscount[]> {
  const { data, error } = await supabaseAdmin
    .from('order_discounts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('promotion_id', promotionId)
    .order('applied_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listOrderDiscountsByPromotion: ${error.message}`);
  return (data ?? []) as OrderDiscount[];
}
