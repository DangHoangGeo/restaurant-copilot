// Promotions management page — Phase 7
// Displays branch-scoped promotions with create/disable/delete actions.

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { resolvePromotionsAccess } from "@/lib/server/promotions/access";
import { getPromotionList } from "@/lib/server/promotions/service";
import { computeDiscounts } from "@/lib/server/finance/queries";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PromotionsDashboard } from "@/components/features/admin/promotions/PromotionsDashboard";
import { getJapanLocalDate } from "@/lib/server/attendance/service";
import { buildBranchPath } from "@/lib/branch-paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.promotions" });
  return { title: t("pageTitle") };
}

export default async function PromotionsPage({
  params,
}: {
  params: Promise<{ locale: string; branchId?: string }>;
}) {
  const { locale, branchId } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/promotions`);
  }

  const access = await resolvePromotionsAccess();
  if (!access) {
    redirect(buildBranchPath(locale, branchId));
  }

  const { restaurantId, canWrite } = access;

  // Japan-local month boundaries for current month discount total
  const today = getJapanLocalDate();
  const [yearStr, monthStr] = today.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${mm}-01`;
  const toDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const [promotions, discounts, restaurantRow] = await Promise.all([
    getPromotionList(restaurantId, true).catch(() => []),
    computeDiscounts(restaurantId, fromDate, toDate).catch(() => ({
      discount_total: 0,
    })),
    supabaseAdmin
      .from("restaurants")
      .select("currency")
      .eq("id", restaurantId)
      .maybeSingle(),
  ]);

  const currency = (restaurantRow.data?.currency as string | null) ?? "JPY";

  return (
    <PromotionsDashboard
      initialPromotions={promotions}
      monthDiscountTotal={discounts.discount_total}
      currency={currency}
      locale={locale}
      canWrite={canWrite}
    />
  );
}
