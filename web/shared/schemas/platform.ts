// Platform Admin API Schemas
// Zod validation schemas for platform-level API endpoints

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const restaurantStatusSchema = z.enum(['trial', 'active', 'inactive', 'suspended']);
export const subscriptionStatusSchema = z.enum(['trial', 'active', 'past_due', 'canceled', 'paused', 'expired']);
export const ticketStatusSchema = z.enum(['new', 'investigating', 'waiting_customer', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketCategorySchema = z.enum(['billing', 'technical', 'feature_request', 'bug_report', 'account', 'general']);

// ============================================
// RESTAURANT ENDPOINTS
// ============================================

export const getRestaurantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'trial', 'active', 'inactive', 'suspended']).optional(),
  plan: z.enum(['all', 'starter', 'growth', 'enterprise']).optional(),
  search: z.string().optional(),
  verified: z.enum(['all', 'verified', 'unverified']).optional(),
  sort: z.enum(['created_at', 'name', 'last_order']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc')
});

export const verifyRestaurantSchema = z.object({
  notes: z.string().optional()
});

export const organizationApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

export const suspendRestaurantSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
  notes: z.string().optional()
});

export const unsuspendRestaurantSchema = z.object({
  notes: z.string().optional()
});

// ============================================
// SUBSCRIPTION ENDPOINTS
// ============================================

export const getSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: subscriptionStatusSchema.optional(),
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  search: z.string().optional()
});

export const updateSubscriptionSchema = z.object({
  plan_id: z.enum(['starter', 'growth', 'enterprise']).optional(),
  status: subscriptionStatusSchema.optional(),
  trial_ends_at: z.string().datetime().optional(),
  current_period_end: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(90)
});

// ============================================
// USAGE ENDPOINTS
// ============================================

export const getUsageQuerySchema = z.object({
  restaurant_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metric: z.enum(['orders', 'revenue', 'customers', 'ai_calls', 'storage']).optional()
});

// ============================================
// LOG ENDPOINTS
// ============================================

export const getLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  level: z.enum(['all', 'info', 'warn', 'error', 'debug']).default('all'),
  restaurant_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional()
});

// ============================================
// SUPPORT TICKET ENDPOINTS
// ============================================

export const getSupportTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  restaurant_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().optional()
});

export const replyToTicketSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  is_internal_note: z.boolean().default(false)
});

export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  resolution_notes: z.string().optional()
});

// ============================================
// DASHBOARD OVERVIEW ENDPOINTS
// ============================================

export const getDashboardOverviewQuerySchema = z.object({
  period: z.enum(['today', '7days', '30days', '90days']).default('30days')
});

// Export types inferred from schemas
export type GetRestaurantsQuery = z.infer<typeof getRestaurantsQuerySchema>;
export type VerifyRestaurantBody = z.infer<typeof verifyRestaurantSchema>;
export type OrganizationApprovalBody = z.infer<typeof organizationApprovalSchema>;
export type SuspendRestaurantBody = z.infer<typeof suspendRestaurantSchema>;
export type GetSubscriptionsQuery = z.infer<typeof getSubscriptionsQuerySchema>;
export type UpdateSubscriptionBody = z.infer<typeof updateSubscriptionSchema>;
export type ExtendTrialBody = z.infer<typeof extendTrialSchema>;
export type GetUsageQuery = z.infer<typeof getUsageQuerySchema>;
export type GetLogsQuery = z.infer<typeof getLogsQuerySchema>;
export type GetSupportTicketsQuery = z.infer<typeof getSupportTicketsQuerySchema>;
export type ReplyToTicketBody = z.infer<typeof replyToTicketSchema>;
export type UpdateTicketBody = z.infer<typeof updateTicketSchema>;
export type GetDashboardOverviewQuery = z.infer<typeof getDashboardOverviewQuerySchema>;
