// Platform Admin API Types
// TypeScript types for platform-level API responses

// ============================================
// PLATFORM ADMIN
// ============================================

export interface PlatformAdmin {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  permissions: {
    restaurants?: string[];
    subscriptions?: string[];
    support?: string[];
    logs?: string[];
    users?: string[];
  };
  created_at: string;
  created_by: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  notes: string | null;
}

// ============================================
// RESTAURANT
// ============================================

export interface RestaurantSummary {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  suspended_at: string | null;
  suspend_reason: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  total_staff: number;
  total_orders_30d: number;
  total_revenue_30d: number;
  last_order_at: string | null;
  support_tickets_open: number;
}

export interface RestaurantDetail extends RestaurantSummary {
  address: string | null;
  description: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  owner_photo: string | null;
  verification_notes: string | null;
  suspend_notes: string | null;
  platform_notes: string | null;
  suspended_by: string | null;
}

export interface OrganizationApprovalSummary {
  id: string;
  name: string;
  public_subdomain: string;
  requested_plan: string | null;
  requested_billing_cycle: 'monthly' | 'yearly' | null;
  created_at: string;
  founder_email: string | null;
  founder_name: string | null;
  branch_count: number;
  primary_branch_name: string | null;
  primary_branch_subdomain: string | null;
}

// ============================================
// SUBSCRIPTION
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_customers_per_day: number | null;
  max_staff_seats: number;
  max_storage_gb: number;
  max_ai_calls_per_month: number;
  features: string[];
  is_active: boolean;
  is_highlighted: boolean;
  is_popular: boolean;
  sort_order: number;
}

export interface TenantSubscription {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  plan_id: string;
  plan_name?: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  billing_provider: string | null;
  external_subscription_id: string | null;
  payment_method_type: string | null;
  payment_method_last4: string | null;
  seat_limit: number | null;
  storage_limit_gb: number | null;
  ai_calls_limit: number | null;
  customers_per_day_limit: number | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
}

export interface SubscriptionReceipt {
  id: string;
  subscription_id: string;
  organization_id: string | null;
  restaurant_id: string;
  receipt_number: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  currency: string;
  subtotal: number;
  total: number;
  status: 'issued' | 'paid' | 'void';
  period_start: string;
  period_end: string;
  issued_at: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// USAGE METRICS
// ============================================

export interface UsageSnapshot {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  snapshot_date: string;
  total_orders: number;
  total_order_items: number;
  total_revenue: number;
  unique_customers: number;
  active_staff_count: number;
  total_staff_hours: number;
  storage_used_mb: number;
  image_count: number;
  ai_calls_count: number;
  ai_tokens_used: number;
  api_calls_count: number;
  api_errors_count: number;
  realtime_connections_peak: number;
  print_jobs_count: number;
}

export interface UsageTrend {
  snapshot_date: string;
  total_orders: number;
  total_revenue: number;
  unique_customers: number;
  ai_calls_count: number;
}

export interface PlatformUsageSummary {
  total_restaurants: number;
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  total_ai_calls: number;
  avg_orders_per_restaurant: number;
  avg_revenue_per_restaurant: number;
}

// ============================================
// SUPPORT TICKETS
// ============================================

export interface SupportTicket {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  ticket_number: number;
  subject: string;
  category: 'billing' | 'technical' | 'feature_request' | 'bug_report' | 'account' | 'general';
  status: 'new' | 'investigating' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submitted_by: string;
  submitter_name: string;
  submitter_email: string;
  submitter_role: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  assigned_at: string | null;
  first_response_at: string | null;
  first_response_sla_breach: boolean;
  resolution_sla_target: string | null;
  resolution_sla_breach: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  message_count?: number;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  posted_by_type: 'restaurant' | 'platform_admin' | 'system';
  posted_by: string | null;
  poster_name: string | null;
  is_internal_note: boolean;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  created_at: string;
  edited_at: string | null;
  edited_by: string | null;
}

export interface SupportTicketSummary {
  total_tickets: number;
  new_tickets: number;
  investigating_tickets: number;
  waiting_customer_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  sla_breached_tickets: number;
  avg_resolution_time_hours: number;
}

// ============================================
// LOGS
// ============================================

export interface PlatformLog {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface PlatformAuditLog {
  id: string;
  admin_id: string;
  admin_name?: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  restaurant_id: string | null;
  restaurant_name?: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================
// DASHBOARD OVERVIEW
// ============================================

export interface DashboardOverview {
  period: 'today' | '7days' | '30days' | '90days';
  tenants: {
    total: number;
    on_trial: number;
    active_subscribers: number;
    suspended: number;
    new_signups: number;
  };
  revenue: {
    total: number;
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
    churn_rate: number;
  };
  support: {
    total_tickets: number;
    new_tickets: number;
    unresolved_tickets: number;
    sla_breached: number;
    avg_resolution_time_hours: number;
  };
  usage: {
    total_orders: number;
    total_customers: number;
    total_ai_calls: number;
    avg_orders_per_tenant: number;
  };
  trends: Array<{
    date: string;
    signups: number;
    orders: number;
    revenue: number;
  }>;
}

// ============================================
// API RESPONSES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}
