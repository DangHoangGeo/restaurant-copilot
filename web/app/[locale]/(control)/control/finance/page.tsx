import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ControlMoneyClient } from '@/components/features/admin/control/control-money-client';
import { resolveOrganizationFinanceAccess } from '@/lib/server/finance/access';
import { getOrganizationFinancePeriodReport } from '@/lib/server/finance/organization';
import { parseYearMonth } from '@/lib/server/finance/service';
import type { FinancePeriodType } from '@/lib/server/finance/types';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';

function parsePeriodType(value: string | undefined): FinancePeriodType {
  return value === 'quarter' ? 'quarter' : 'month';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.finance' });
  return { title: t('company.pageTitle') };
}

export default async function ControlMoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    year?: string;
    month?: string;
    period?: string;
    restaurantId?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const access = await resolveOrganizationFinanceAccess();

  if (!access) {
    redirect(`/${locale}/control/overview`);
  }

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(sp.year ?? null, sp.month ?? null));
  } catch {
    redirect(`/${locale}/control/finance`);
  }

  const periodType = parsePeriodType(sp.period);
  const allBranches = await listOrganizationBranches(access.organizationId);
  const branches = allBranches
    .filter((branch) => access.accessibleRestaurantIds.includes(branch.id))
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
    }));

  const selectedRestaurantId =
    sp.restaurantId && access.accessibleRestaurantIds.includes(sp.restaurantId)
      ? sp.restaurantId
      : null;

  const report = await getOrganizationFinancePeriodReport({
    organizationId: access.organizationId,
    branchIds: access.accessibleRestaurantIds,
    selectedRestaurantId,
    year,
    month,
    periodType,
    currency: access.currency,
    locale,
  });

  return (
    <ControlMoneyClient
      locale={locale}
      currency={access.currency}
      year={year}
      month={month}
      periodType={periodType}
      branches={branches}
      report={report}
      canExport={access.canExport}
      canViewIncome={access.canViewIncome}
      canViewSpending={access.canViewSpending}
      canManageExpenses={access.canManageExpenses}
    />
  );
}
