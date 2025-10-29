/**
 * Common validation schemas for API requests
 * Phase 1: Critical Fixes & Guardrails
 */

import { z } from 'zod';

export const VALIDATION_LIMITS = {
  MAX_PAGE_SIZE: 100,
  MAX_DATE_RANGE_DAYS: 92,
  MIN_PAGE_SIZE: 1,
  DEFAULT_PAGE_SIZE: 25,
  MAX_STRING_LENGTH: 1000,
  MAX_ARRAY_LENGTH: 100,
} as const;

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .min(VALIDATION_LIMITS.MIN_PAGE_SIZE)
    .max(VALIDATION_LIMITS.MAX_PAGE_SIZE)
    .default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
});

export const cursorPaginationSchema = paginationSchema.extend({
  cursor: z.string().uuid().optional(),
});

// Date ranges with 92-day limit
export const dateRangeSchema = z.object({
  fromDate: z.string().datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  toDate: z.string().datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
}).refine(
  (data) => {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    const diffInDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays <= VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS;
  },
  { message: `Date range cannot exceed ${VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS} days` }
);

// Sorting with allowlist
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

export function createSortSchema(allowedFields: readonly string[]) {
  return z.object({
    sortBy: z.enum(allowedFields as [string, ...string[]]).default(allowedFields[0]),
    sortDirection: sortDirectionSchema,
  });
}

// Status filters
export const orderStatusSchema = z.enum([
  'new', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'canceled', 'canceled'
]).transform(val => val === 'canceled' ? 'canceled' : val);

export const orderStatusArraySchema = z.array(orderStatusSchema)
  .max(VALIDATION_LIMITS.MAX_ARRAY_LENGTH)
  .default(['new', 'serving']);

export const periodSchema = z.enum([
  'today', 'yesterday', 'thisWeek', 'last7days', 'last30days', 'last90days'
]);

// Type exports
export type PaginationParams = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;