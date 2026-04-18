import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PromotionsDashboard } from "@/components/features/admin/promotions/PromotionsDashboard";
import { getJapanLocalDate } from "@/lib/server/attendance/service";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { computeDiscounts } from "@/lib/server/finance/queries";
import { resolvePromotionsAccess } from "@/lib/server/promotions/access";
import { getPromotionList } from "@/lib/server/promotions/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.promotions" });
  return { title: t("pageTitle") };
}

export default async function ControlPromotionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [ctx, access] = await Promise.all([
    resolveFounderControlContext(),
    resolvePromotionsAccess(),
  ]);

  if (!ctx || !access) {
    redirect(`/${locale}/control/overview`);
  }

  const { restaurantId, canWrite } = access;
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
    computeDiscounts(restaurantId, fromDate, toDate).catch(() => ({ discount_total: 0 })),
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
      financeHref="/control/finance"
      purchasingHref="/branch/purchasing"
      promotionsHref="/control/promotions"
    />
  );
}
