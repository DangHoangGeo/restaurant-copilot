// Promotions domain — TypeScript types for Phase 7.

export type DiscountType = 'percentage' | 'flat';

/** A persisted promotion row. */
export interface Promotion {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A persisted order_discount row — the audit trail. */
export interface OrderDiscount {
  id: string;
  restaurant_id: string;
  order_id: string;
  order_created_at: string;
  promotion_id: string | null;
  promotion_code: string;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  currency: string;
  applied_at: string;
  applied_by_session: string | null;
}

/** Result of a promo-code validation check (preview, not applied). */
export interface ValidationResult {
  valid: boolean;
  promotion: Promotion | null;
  discount_amount: number;
  error?: string;
}
