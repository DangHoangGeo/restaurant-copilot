import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ControlMoneyClient } from '@/components/features/admin/control/control-money-client';
import { resolveFounderControlContext } from '@/lib/server/control/access';
import { resolveFinanceAccess } from '@/lib/server/finance/access';
import {
  getMonthlyReport,
  getMonthlyRollupForBranches,
  listMonthlySnapshots,
  parseYearMonth,
} from '@/lib/server/finance/service';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.control' });
  return { title: t('money.title') };
}

export default async function ControlMoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const [ctx, access] = await Promise.all([
    resolveFounderControlContext(),
    resolveFinanceAccess(),
  ]);

  if (!ctx || !access) {
    redirect(`/${locale}/control/overview`);
  }

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(sp.year ?? null, sp.month ?? null));
  } catch {
    redirect(`/${locale}/control/finance`);
  }

  const allBranches = await listOrganizationBranches(ctx.organization.id);
  const accessibleBranches = allBranches.filter((branch) =>
    ctx.accessibleRestaurantIds.includes(branch.id)
  );
  const accessibleBranchIds = accessibleBranches.map((branch) => branch.id);

  const [rollup, report, history] = await Promise.all([
    getMonthlyRollupForBranches({
      branchIds: accessibleBranchIds,
      year,
      month,
    }),
    getMonthlyReport(access.restaurantId, year, month, access.currency).catch(() => null),
    listMonthlySnapshots(access.restaurantId, 12).catch(() => []),
  ]);

  const snapshotByBranch = new Map(
    rollup.snapshots.map((snapshot) => [snapshot.restaurant_id, snapshot])
  );

  const branchSummaries = accessibleBranches.map((branch) => {
    const snapshot = snapshotByBranch.get(branch.id);

    return {
      restaurantId: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
      hasClosedSnapshot: Boolean(snapshot),
      revenueTotal: snapshot?.revenue_total ?? 0,
      discountTotal: snapshot?.discount_total ?? 0,
      approvedLaborHours: snapshot?.approved_labor_hours ?? 0,
      combinedCostTotal: snapshot?.combined_cost_total ?? 0,
      grossProfitEstimate: snapshot?.gross_profit_estimate ?? 0,
      isActive: branch.id === access.restaurantId,
    };
  });

  return (
    <ControlMoneyClient
      locale={locale}
      currency={access.currency}
      year={year}
      month={month}
      branchCount={rollup.branch_count}
      branchesWithSnapshot={rollup.branches_with_snapshot}
      revenueTotal={rollup.revenue_total}
      discountTotal={rollup.discount_total}
      approvedLaborHours={rollup.approved_labor_hours}
      combinedCostTotal={rollup.combined_cost_total}
      grossProfitEstimate={rollup.gross_profit_estimate}
      branches={branchSummaries}
      report={report}
      history={history}
      canClose={access.canClose}
    />
  );
}
