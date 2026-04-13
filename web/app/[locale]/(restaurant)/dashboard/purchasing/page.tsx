// Purchasing management page — Phase 5
// Shows purchase orders, quick expenses, and supplier directory for the active branch.

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import {
  getPurchaseOrders,
  getExpenses,
  getSuppliers,
  getPurchaseSummaryForPeriod,
} from "@/lib/server/purchasing/service";
import { PurchasingDashboard } from "@/components/features/admin/purchasing/PurchasingDashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.purchasing" });
  return { title: t("pageTitle") };
}

export default async function PurchasingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    redirect(`/${locale}/login`);
  }

  const restaurantId = user.restaurantId;

  // Current month boundaries for summary
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Load restaurant currency
  const { data: restaurantRow } = await supabaseAdmin
    .from("restaurants")
    .select("currency")
    .eq("id", restaurantId)
    .maybeSingle();

  const currency = (restaurantRow?.currency as string | null) ?? "JPY";

  // Parallel data fetches
  const [orders, expenses, suppliers, monthlySummary] = await Promise.all([
    getPurchaseOrders(restaurantId, { limit: 50, offset: 0 }).catch(() => []),
    getExpenses(restaurantId, { limit: 50, offset: 0 }).catch(() => []),
    getSuppliers(restaurantId).catch(() => []),
    getPurchaseSummaryForPeriod(restaurantId, monthStart, monthEnd, currency).catch(() => ({
      total_orders_amount: 0,
      order_count: 0,
      total_expenses_amount: 0,
      expense_count: 0,
      combined_total: 0,
      currency,
    })),
  ]);

  return (
    <PurchasingDashboard
      initialOrders={orders}
      initialExpenses={expenses}
      initialSuppliers={suppliers}
      restaurantCurrency={currency}
      monthlyOrdersTotal={monthlySummary.total_orders_amount}
      monthlyExpensesTotal={monthlySummary.total_expenses_amount}
    />
  );
}
