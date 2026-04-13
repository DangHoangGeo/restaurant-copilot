// Monthly Finance Close page — Phase 6
// Displays a live-computed or closed monthly finance summary for the active branch.

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveFinanceAccess } from "@/lib/server/finance/access";
import { getMonthlyReport, listMonthlySnapshots, parseYearMonth } from "@/lib/server/finance/service";
import { FinanceDashboard } from "@/components/features/admin/finance/FinanceDashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const access = await resolveFinanceAccess();
  if (!access) {
    redirect(`/${locale}/dashboard`);
  }

  const { restaurantId, currency, canClose } = access;

  let year: number;
  let month: number;
  try {
    ({ year, month } = parseYearMonth(sp.year ?? null, sp.month ?? null));
  } catch {
    redirect(`/${locale}/dashboard/finance`);
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

  const restaurantName = (restaurantRow.data?.name as string | null) ?? "Branch";

  return (
    <FinanceDashboard
      year={year}
      month={month}
      report={report}
      history={history}
      currency={currency}
      locale={locale}
      restaurantName={restaurantName}
      canClose={canClose}
    />
  );
}
