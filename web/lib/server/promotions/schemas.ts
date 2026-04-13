// Promotions domain — Zod validation schemas for Phase 7.

import { z } from 'zod';

export const discountTypeValues = ['percentage', 'flat'] as const;

export const CreatePromotionSchema = z.object({
  code:                z.string().min(1).max(50).trim().toUpperCase(),
  description:         z.string().max(500).optional().nullable(),
  discount_type:       z.enum(discountTypeValues),
  discount_value:      z.number().positive(),
  min_order_amount:    z.number().min(0).optional().nullable(),
  max_discount_amount: z.number().min(0).optional().nullable(),
  valid_from:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  valid_until:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  usage_limit:         z.number().int().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Percentage discounts cannot exceed 100',
    });
  }

  if (
    data.valid_from &&
    data.valid_until &&
    data.valid_until < data.valid_from
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valid_until'],
      message: 'End date must be on or after the start date',
    });
  }
});

export const UpdatePromotionSchema = z.object({
  description:         z.string().max(500).optional().nullable(),
  min_order_amount:    z.number().min(0).optional().nullable(),
  max_discount_amount: z.number().min(0).optional().nullable(),
  valid_from:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  valid_until:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  usage_limit:         z.number().int().positive().optional().nullable(),
  is_active:           z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (
    data.valid_from &&
    data.valid_until &&
    data.valid_until < data.valid_from
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valid_until'],
      message: 'End date must be on or after the start date',
    });
  }
});

export const ValidatePromoSchema = z.object({
  code:          z.string().min(1).max(50),
  order_amount:  z.number().min(0),
  restaurant_id: z.string().uuid(),
});

export const ApplyPromoSchema = z.object({
  code:          z.string().min(1).max(50),
  order_id:      z.string().uuid(),
  session_id:    z.string().uuid(),
  restaurant_id: z.string().uuid(),
  currency:      z.string().length(3).default('JPY'),
});

export type CreatePromotionInput  = z.infer<typeof CreatePromotionSchema>;
export type UpdatePromotionInput  = z.infer<typeof UpdatePromotionSchema>;
export type ValidatePromoInput    = z.infer<typeof ValidatePromoSchema>;
export type ApplyPromoInput       = z.infer<typeof ApplyPromoSchema>;
