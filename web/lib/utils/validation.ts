import { z } from "zod";

// Constants for validation limits
export const VALIDATION_LIMITS = {
  MAX_PAGE_SIZE: 100,
  MAX_DATE_RANGE_DAYS: 92, // Extended to 92 days as per phase 1 spec
  MIN_PAGE_SIZE: 1,
  DEFAULT_PAGE_SIZE: 25, // Updated to 25 as per phase 1 spec
} as const;

// Common date validation schemas
export const dateStringSchema = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
);

export const dateRangeSchema = z.object({
  fromDate: dateStringSchema,
  toDate: dateStringSchema,
}).refine((data) => {
  const from = new Date(data.fromDate);
  const to = new Date(data.toDate);
  const diffInDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays <= VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS} days`,
});

// Pagination validation schemas (updated for Phase 1 requirements)
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .min(VALIDATION_LIMITS.MIN_PAGE_SIZE)
    .max(VALIDATION_LIMITS.MAX_PAGE_SIZE)
    .default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
  cursor: z.string().uuid().optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int()
    .min(VALIDATION_LIMITS.MIN_PAGE_SIZE)
    .max(VALIDATION_LIMITS.MAX_PAGE_SIZE)
    .default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

// Common enum schemas
export const orderStatusSchema = z.enum([
  "new", 
  "confirmed", 
  "preparing", 
  "ready", 
  "serving", 
  "completed", 
  "canceled",
  "canceled" // Accept both spellings
]).transform(val => val === "canceled" ? "canceled" : val);

export const orderStatusArraySchema = z.array(orderStatusSchema).default(["new", "serving"]);

export const periodSchema = z.enum([
  "today",
  "yesterday", 
  "thisWeek",
  "last7days",
  "last30days"
]);

// Orders GET query validation schema
export const ordersGetQuerySchema = z.object({
  fromDate: dateStringSchema.optional(),
  toDate: dateStringSchema.optional(),
  status: z.string().optional().transform((val) => {
    if (!val) return undefined;
    // Handle URL decoding issues and normalize the string
    const decoded = decodeURIComponent(val);
    return decoded.split(/[,+]/).map(s => s.trim()).filter(Boolean);
  }).pipe(orderStatusArraySchema.optional()),
  period: periodSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .min(VALIDATION_LIMITS.MIN_PAGE_SIZE)
    .max(VALIDATION_LIMITS.MAX_PAGE_SIZE)
    .default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
}).refine((data) => {
  // If both custom dates and period are provided, dates take precedence
  if (data.fromDate && data.toDate) {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    const diffInDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays <= VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS;
  }
  return true;
}, {
  message: `Date range cannot exceed ${VALIDATION_LIMITS.MAX_DATE_RANGE_DAYS} days`,
});

// Categories GET query validation schema
export const categoriesGetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .min(VALIDATION_LIMITS.MIN_PAGE_SIZE)
    .max(200) // Allow higher limit for categories to support "get all" use case
    .default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
  include: z.string().optional().transform((val) => 
    val ? val.split(',').map(s => s.trim()) : []
  ).pipe(z.array(z.enum(["items", "sizes", "toppings", "counts"])).default([])),
});

// Utility functions for date range calculation
export function calculateDateRange(
  period?: string,
  fromDate?: string,
  toDate?: string
): { startDate: string; endDate: string } {
  if (fromDate && toDate) {
    return {
      startDate: new Date(fromDate + 'T00:00:00.000Z').toISOString(),
      endDate: new Date(toDate + 'T23:59:59.999Z').toISOString(),
    };
  }

  const now = new Date();
  switch (period) {
    case 'today':
      return {
        startDate: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
        endDate: new Date(now.setHours(23, 59, 59, 999)).toISOString(),
      };
    case 'yesterday': {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: new Date(yesterday.setHours(0, 0, 0, 0)).toISOString(),
        endDate: new Date(yesterday.setHours(23, 59, 59, 999)).toISOString(),
      };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      return {
        startDate: new Date(startOfWeek.setHours(0, 0, 0, 0)).toISOString(),
        endDate: new Date().toISOString(),
      };
    }
    case 'last7days':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };
    case 'last30days':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };
    default: {
      // Default to today
      const today = new Date();
      return {
        startDate: new Date(today.setHours(0, 0, 0, 0)).toISOString(),
        endDate: new Date(today.setHours(23, 59, 59, 999)).toISOString(),
      };
    }
  }
}

// Utility function to create pagination metadata
export function createPaginationMeta(
  page: number,
  pageSize: number,
  totalCount: number
) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}