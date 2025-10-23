// GET /api/v1/platform/overview
// Dashboard overview with key metrics and trends

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError
} from '@/lib/platform-admin';
import { getDashboardOverviewQuerySchema } from '@/shared/schemas/platform';
import type { DashboardOverview } from '@/shared/types/platform';

export async function GET(request: NextRequest) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Validate query parameters
    const query = getDashboardOverviewQuerySchema.parse(queryParams);

    const supabase = await createClient();

    // Calculate date range based on period
    const now = new Date();
    const periodStart = new Date();

    switch (query.period) {
      case 'today':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case '7days':
        periodStart.setDate(now.getDate() - 7);
        break;
      case '30days':
        periodStart.setDate(now.getDate() - 30);
        break;
      case '90days':
        periodStart.setDate(now.getDate() - 90);
        break;
    }

    // Get tenant statistics
    const { data: allRestaurants } = await supabase
      .from('restaurants')
      .select('id, created_at, suspended_at');

    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('status, restaurant_id, trial_ends_at, current_period_end, canceled_at');

    const totalTenants = allRestaurants?.length || 0;
    const newSignups =
      allRestaurants?.filter(
        (r) => new Date(r.created_at) >= periodStart
      ).length || 0;
    const suspended =
      allRestaurants?.filter((r) => r.suspended_at !== null).length || 0;

    const onTrial =
      subscriptions?.filter((s) => s.status === 'trial').length || 0;
    const activeSubscribers =
      subscriptions?.filter((s) => s.status === 'active').length || 0;

    // Calculate churn (cancellations in period)
    const canceledInPeriod =
      subscriptions?.filter(
        (s) =>
          s.canceled_at &&
          new Date(s.canceled_at) >= periodStart
      ).length || 0;

    // Get support ticket statistics
    const { data: supportSummary } = await supabase.rpc(
      'get_support_ticket_summary'
    );

    const supportStats = supportSummary?.[0] || {
      total_tickets: 0,
      new_tickets: 0,
      sla_breached_tickets: 0,
      avg_resolution_time_hours: 0
    };

    const unresolvedTickets =
      (supportStats.total_tickets || 0) -
      (supportStats.resolved_tickets || 0) -
      (supportStats.closed_tickets || 0);

    // Get revenue metrics (from active subscriptions)
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, price_monthly, price_yearly');

    const planPriceMap = new Map<string, { monthly: number; yearly: number }>();
    plans?.forEach((p) => {
      planPriceMap.set(p.id, {
        monthly: Number(p.price_monthly),
        yearly: Number(p.price_yearly)
      });
    });

    let totalMRR = 0;
    let totalARR = 0;

    subscriptions
      ?.filter((s) => s.status === 'active')
      .forEach((s) => {
        const prices = planPriceMap.get(
          // @ts-ignore - plan_id exists in join
          s.plan_id || ''
        );
        if (prices) {
          // Determine billing cycle from subscription
          const isYearly =
            s.current_period_end &&
            s.trial_ends_at &&
            new Date(s.current_period_end).getTime() -
              new Date(s.trial_ends_at).getTime() >
              31 * 24 * 60 * 60 * 1000;

          if (isYearly) {
            totalARR += prices.yearly;
            totalMRR += prices.yearly / 12;
          } else {
            totalMRR += prices.monthly;
            totalARR += prices.monthly * 12;
          }
        }
      });

    const churnRate =
      activeSubscribers > 0
        ? (canceledInPeriod / activeSubscribers) * 100
        : 0;

    // Get usage statistics
    const { data: platformUsage } = await supabase.rpc(
      'get_platform_usage_summary',
      {
        target_date: now.toISOString().split('T')[0]
      }
    );

    const usageStats = platformUsage?.[0] || {
      total_orders: 0,
      total_customers: 0,
      total_ai_calls: 0,
      avg_orders_per_restaurant: 0
    };

    // Get trend data
    const { data: trendData } = await supabase
      .from('tenant_usage_snapshots')
      .select('snapshot_date, total_orders, total_revenue')
      .gte('snapshot_date', periodStart.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    // Aggregate by date
    const trendMap = new Map<
      string,
      { orders: number; revenue: number }
    >();

    trendData?.forEach((t) => {
      const existing = trendMap.get(t.snapshot_date) || {
        orders: 0,
        revenue: 0
      };
      trendMap.set(t.snapshot_date, {
        orders: existing.orders + t.total_orders,
        revenue: existing.revenue + Number(t.total_revenue)
      });
    });

    // Get signup trends
    const signupTrendMap = new Map<string, number>();
    allRestaurants?.forEach((r) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      if (new Date(date) >= periodStart) {
        signupTrendMap.set(date, (signupTrendMap.get(date) || 0) + 1);
      }
    });

    const trends = Array.from(trendMap.entries()).map(([date, values]) => ({
      date,
      signups: signupTrendMap.get(date) || 0,
      orders: values.orders,
      revenue: values.revenue
    }));

    // Build overview response
    const overview: DashboardOverview = {
      period: query.period,
      tenants: {
        total: totalTenants,
        on_trial: onTrial,
        active_subscribers: activeSubscribers,
        suspended: suspended,
        new_signups: newSignups
      },
      revenue: {
        total: totalARR,
        mrr: totalMRR,
        arr: totalARR,
        churn_rate: churnRate
      },
      support: {
        total_tickets: supportStats.total_tickets || 0,
        new_tickets: supportStats.new_tickets || 0,
        unresolved_tickets: unresolvedTickets,
        sla_breached: supportStats.sla_breached_tickets || 0,
        avg_resolution_time_hours: supportStats.avg_resolution_time_hours || 0
      },
      usage: {
        total_orders: usageStats.total_orders || 0,
        total_customers: usageStats.total_customers || 0,
        total_ai_calls: usageStats.total_ai_calls || 0,
        avg_orders_per_tenant: usageStats.avg_orders_per_restaurant || 0
      },
      trends
    };

    return platformApiResponse(overview);
  } catch (error) {
    console.error('Error in GET /platform/overview:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid query parameters', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
