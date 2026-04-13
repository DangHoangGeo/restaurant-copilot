// Purchasing domain Zod validation schemas

import { z } from 'zod';

// ─── Supplier ────────────────────────────────────────────

export const supplierCategoryValues = [
  'food',
  'beverage',
  'equipment',
  'utilities',
  'general',
] as const;

export const CreateSupplierSchema = z.object({
  name:          z.string().min(1).max(200),
  category:      z.enum(supplierCategoryValues).default('general'),
  contact_name:  z.string().max(200).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable(),
  notes:         z.string().max(1000).optional().nullable(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ─── Purchase Order ───────────────────────────────────────

export const purchaseCategoryValues = [
  'food',
  'beverage',
  'equipment',
  'utilities',
  'other',
] as const;

export const purchaseOrderStatusValues = [
  'pending',
  'received',
  'cancelled',
] as const;

export const PurchaseOrderItemInputSchema = z.object({
  name:       z.string().min(1).max(300),
  quantity:   z.number().positive(),
  unit:       z.string().max(30).optional().nullable(),
  unit_price: z.number().min(0),
  notes:      z.string().max(500).optional().nullable(),
});

export const CreatePurchaseOrderSchema = z.object({
  supplier_id:    z.string().uuid().optional().nullable(),
  supplier_name:  z.string().max(200).optional().nullable(),
  category:       z.enum(purchaseCategoryValues).default('other'),
  order_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  received_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  total_amount:   z.number().min(0),
  currency:       z.string().length(3).default('JPY'),
  tax_amount:     z.number().min(0).optional().nullable(),
  notes:          z.string().max(1000).optional().nullable(),
  receipt_url:    z.string().url().optional().nullable(),
  is_paid:        z.boolean().default(false),
  items:          z.array(PurchaseOrderItemInputSchema).optional(),
});

export const UpdatePurchaseOrderSchema = z.object({
  supplier_id:    z.string().uuid().optional().nullable(),
  supplier_name:  z.string().max(200).optional().nullable(),
  category:       z.enum(purchaseCategoryValues).optional(),
  status:         z.enum(purchaseOrderStatusValues).optional(),
  order_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  received_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  total_amount:   z.number().min(0).optional(),
  tax_amount:     z.number().min(0).optional().nullable(),
  notes:          z.string().max(1000).optional().nullable(),
  receipt_url:    z.string().url().optional().nullable(),
  is_paid:        z.boolean().optional(),
});

// ─── Expense ──────────────────────────────────────────────

export const expenseCategoryValues = [
  'food',
  'transport',
  'utilities',
  'maintenance',
  'other',
] as const;

export const CreateExpenseSchema = z.object({
  category:     z.enum(expenseCategoryValues).default('other'),
  description:  z.string().min(1).max(500),
  amount:       z.number().positive(),
  currency:     z.string().length(3).default('JPY'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receipt_url:  z.string().url().optional().nullable(),
  notes:        z.string().max(1000).optional().nullable(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

// ─── List query params ────────────────────────────────────

export const ListPurchaseOrdersSchema = z.object({
  status:       z.enum(purchaseOrderStatusValues).optional(),
  category:     z.enum(purchaseCategoryValues).optional(),
  supplier_id:  z.string().uuid().optional(),
  from_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_paid:      z.enum(['true', 'false']).optional(),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  offset:       z.coerce.number().int().min(0).default(0),
});

export const ListExpensesSchema = z.object({
  category:     z.enum(expenseCategoryValues).optional(),
  from_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  offset:       z.coerce.number().int().min(0).default(0),
});

export type CreateSupplierInput       = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput       = z.infer<typeof UpdateSupplierSchema>;
export type CreatePurchaseOrderInput  = z.infer<typeof CreatePurchaseOrderSchema>;
export type UpdatePurchaseOrderInput  = z.infer<typeof UpdatePurchaseOrderSchema>;
export type CreateExpenseInput        = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput        = z.infer<typeof UpdateExpenseSchema>;
export type ListPurchaseOrdersInput   = z.infer<typeof ListPurchaseOrdersSchema>;
export type ListExpensesInput         = z.infer<typeof ListExpensesSchema>;
