// Cross-branch overview dashboard for founders
// Sprint 2 — A3: shows today's revenue and open orders per branch

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';
import { OverviewClient } from './overview-client';
import type { OrgBranchOverview, OrgOverviewResponse } from '@/shared/types/organization';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.overview' });
  return { title: t('pageTitle') };
}

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const ctx = await resolveOrgContext();
  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const authz = buildAuthorizationService(ctx);

  // Only founders get the cross-branch overview
  const founderRoles = [
    'founder_full_control',
    'founder_operations',
    'founder_finance',
  ] as const;

  if (!founderRoles.includes(authz!.role as typeof founderRoles[number])) {
    redirect(`/${locale}/dashboard`);
  }

  // Load branches accessible to this member
  const allBranches = await listOrganizationBranches(ctx.organization.id);
  const accessibleIds = new Set(ctx.accessibleRestaurantIds);
  const branches = allBranches.filter((b) => accessibleIds.has(b.id));

  let overviewData: OrgOverviewResponse = {
    branches: [],
    total_today_revenue: 0,
    total_open_orders: 0,
  };

  if (branches.length > 0) {
    const restaurantIds = branches.map((b) => b.id);
    const today = new Date().toISOString().split('T')[0];

    const [salesResult, openOrdersResult, restaurantResult] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('restaurant_id, total_amount')
        .in('restaurant_id', restaurantIds)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`),

      supabaseAdmin
        .from('orders')
        .select('restaurant_id')
        .in('restaurant_id', restaurantIds)
        .not('status', 'in', '("completed","canceled")'),

      supabaseAdmin
        .from('restaurants')
        .select('id, name, subdomain')
        .in('id', restaurantIds),
    ]);

    const revenueByBranch = new Map<string, number>();
    for (const order of salesResult.data ?? []) {
      const prev = revenueByBranch.get(order.restaurant_id) ?? 0;
      revenueByBranch.set(order.restaurant_id, prev + (order.total_amount ?? 0));
    }

    const openOrdersByBranch = new Map<string, number>();
    for (const order of openOrdersResult.data ?? []) {
      const prev = openOrdersByBranch.get(order.restaurant_id) ?? 0;
      openOrdersByBranch.set(order.restaurant_id, prev + 1);
    }

    const restaurantMap = new Map(
      (restaurantResult.data ?? []).map((r) => [r.id, r])
    );

    const branchOverviews: OrgBranchOverview[] = branches.map((b) => {
      const restaurant = restaurantMap.get(b.id);
      return {
        restaurant_id: b.id,
        name: restaurant?.name ?? b.name,
        subdomain: restaurant?.subdomain ?? b.subdomain,
        today_revenue: revenueByBranch.get(b.id) ?? 0,
        open_orders_count: openOrdersByBranch.get(b.id) ?? 0,
      };
    });

    overviewData = {
      branches: branchOverviews,
      total_today_revenue: branchOverviews.reduce((s, b) => s + b.today_revenue, 0),
      total_open_orders: branchOverviews.reduce((s, b) => s + b.open_orders_count, 0),
    };
  }

  return (
    <OverviewClient
      data={overviewData}
      currency={ctx.organization.currency}
    />
  );
}
