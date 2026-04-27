// Monthly Finance Close page — Phase 6
// Displays a live-computed or closed monthly finance summary for the active branch.

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  resolveFinanceAccess,
  resolveScopedBranchFinanceAccess,
} from "@/lib/server/finance/access";
import {
  getMonthlyReport,
  listMonthlySnapshots,
  parseYearMonth,
} from "@/lib/server/finance/service";
import { FinanceDashboard } from "@/components/features/admin/finance/FinanceDashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildBranchPath } from "@/lib/branch-paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.finance" });
  return { title: t("pageTitle") };
}

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; branchId?: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { locale, branchId } = await params;
  const sp = await searchParams;

  const access = branchId
    ? await resolveScopedBranchFinanceAccess(branchId)
    : await resolveFinanceAccess();
  if (!access) {
    redirect(buildBranchPath(locale, branchId));
  }

  const { restaurantId, currency, canClose } = access;

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(sp.year ?? null, sp.month ?? null));
  } catch {
    redirect(buildBranchPath(locale, branchId, "finance"));
  }

  const [report, history, restaurantRow] = await Promise.all([
    getMonthlyReport(restaurantId, year, month, currency).catch(() => null),
    listMonthlySnapshots(restaurantId, 12).catch(() => []),
    supabaseAdmin
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle(),
  ]);

  const restaurantName =
    (restaurantRow.data?.name as string | null) ?? "Branch";

  return (
    <FinanceDashboard
      year={year}
      month={month}
      report={report}
      history={history}
      currency={currency}
      locale={locale}
      restaurantName={restaurantName}
      canExport={access.canExport}
      canClose={canClose}
    />
  );
}
