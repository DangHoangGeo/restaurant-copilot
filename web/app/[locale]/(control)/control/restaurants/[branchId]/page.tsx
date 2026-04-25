import { notFound } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import {
  getMonthlyReport,
  listMonthlySnapshots,
  parseYearMonth,
} from "@/lib/server/finance/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listOrganizationEmployees } from "@/lib/server/organizations/queries";
import { getBranchOverview } from "@/lib/server/control/branch-overview";
import { getBranchFinanceDetail } from "@/lib/server/control/branch-finance-detail";
import { getBranchTeamPayrollData } from "@/lib/server/control/branch-team";
import { ControlBranchDetailClient } from "@/components/features/admin/control/control-branch-detail-client";
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
} from "@/lib/server/finance/types";
import type { BranchFinanceDetailData } from "@/lib/server/control/branch-finance-detail";

export interface BranchSettings {
  id: string;
  name: string;
  subdomain: string;
  branch_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  currency: string | null;
  tax: number | null;
  default_language: string | null;
  opening_hours: unknown | null;
  onboarded: boolean | null;
}

export type BranchDetailTab = "overview" | "finance" | "team" | "setup";

export default async function ControlBranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; branchId: string }>;
  searchParams: Promise<{ tab?: string; year?: string; month?: string }>;
}) {
  const [{ locale, branchId }, sp, ctx] = await Promise.all([
    params,
    searchParams,
    resolveFounderControlContext(),
  ]);

  if (!ctx) {
    notFound();
  }

  if (!ctx.accessibleRestaurantIds.includes(branchId)) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  const canExportFinance = Boolean(authz?.can("finance_exports"));
  const canViewFinanceIncome = Boolean(
    authz?.can("reports") || authz?.can("finance_exports"),
  );
  const canViewFinanceSpending = Boolean(
    authz?.can("purchases") || authz?.can("finance_exports"),
  );
  const canManageExpenses = Boolean(authz?.can("purchases"));
  const canViewFinance = canViewFinanceIncome || canViewFinanceSpending;
  const canCloseFinance =
    ctx.member.role === "founder_full_control" && canExportFinance;

  const [branchResult, employees, overview] = await Promise.all([
    supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, subdomain, branch_code, address, phone, email, timezone, currency, tax, default_language, opening_hours, onboarded",
      )
      .eq("id", branchId)
      .single(),
    listOrganizationEmployees([branchId]),
    getBranchOverview(branchId, ctx.organization.timezone, locale),
  ]);

  if (branchResult.error || !branchResult.data) {
    notFound();
  }

  const branch = branchResult.data as BranchSettings;
  const teamPayroll = await getBranchTeamPayrollData({
    branchId,
    employees,
    timezone: branch.timezone ?? ctx.organization.timezone,
    currency: branch.currency ?? ctx.organization.currency,
  });
  const rawTab = sp.tab;
  const activeTab: BranchDetailTab =
    rawTab === "finance" && canViewFinance
      ? "finance"
      : rawTab === "team"
        ? "team"
        : rawTab === "setup"
          ? "setup"
          : "overview";

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(sp.year ?? null, sp.month ?? null));
  } catch {
    ({ year, month } = parseYearMonth(null, null));
  }
  let financeReport: MonthlyFinanceReport | null = null;
  let financeHistory: MonthlyFinanceSnapshot[] = [];
  let financeDetail: BranchFinanceDetailData | null = null;

  if (canViewFinance && activeTab === "finance") {
    [financeReport, financeHistory, financeDetail] = await Promise.all([
      getMonthlyReport(
        branchId,
        year,
        month,
        branch.currency ?? ctx.organization.currency,
      ).catch(() => null),
      listMonthlySnapshots(branchId, 12).catch(() => []),
      getBranchFinanceDetail({
        branchId,
        year,
        month,
        timezone: branch.timezone ?? ctx.organization.timezone,
      }).catch(() => null),
    ]);
  }

  return (
    <ControlBranchDetailClient
      branch={branch}
      employees={employees}
      overview={overview}
      teamPayroll={teamPayroll}
      initialTab={activeTab}
      currency={ctx.organization.currency}
      orgTimezone={ctx.organization.timezone}
      canViewFinance={canViewFinance}
      financeReport={financeReport}
      financeHistory={financeHistory}
      financeYear={year}
      financeMonth={month}
      canCloseFinance={canCloseFinance}
      canExportFinance={canExportFinance}
      canViewFinanceIncome={canViewFinanceIncome}
      canViewFinanceSpending={canViewFinanceSpending}
      canManageExpenses={canManageExpenses}
      financeDetail={financeDetail}
    />
  );
}
