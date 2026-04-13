"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart, Receipt, Building2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseOrderList } from "./PurchaseOrderList";
import { ExpenseList } from "./ExpenseList";
import { SupplierList } from "./SupplierList";
import type { PurchaseOrder, Expense, Supplier } from "@/lib/server/purchasing/types";

type Tab = "orders" | "expenses" | "suppliers";

interface PurchasingDashboardProps {
  initialOrders: PurchaseOrder[];
  initialExpenses: Expense[];
  initialSuppliers: Supplier[];
  restaurantCurrency: string;
  /** Pre-computed totals for the current month to avoid extra client-side fetch */
  monthlyOrdersTotal: number;
  monthlyExpensesTotal: number;
  monthStart: string;
  monthEnd: string;
  canWrite: boolean;
}

export function PurchasingDashboard({
  initialOrders,
  initialExpenses,
  initialSuppliers,
  restaurantCurrency,
  monthlyOrdersTotal,
  monthlyExpensesTotal,
  monthStart,
  monthEnd,
  canWrite,
}: PurchasingDashboardProps) {
  const t = useTranslations("owner.purchasing");
  const [activeTab, setActiveTab] = useState<Tab>("orders");

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: restaurantCurrency || "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  const tabs: Array<{ key: Tab; labelKey: string; icon: React.ReactNode }> = [
    { key: "orders",    labelKey: "tabs.orders",    icon: <ShoppingCart className="h-4 w-4" /> },
    { key: "expenses",  labelKey: "tabs.expenses",  icon: <Receipt      className="h-4 w-4" /> },
    { key: "suppliers", labelKey: "tabs.suppliers", icon: <Building2    className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("pageDescription")}</p>
          </div>
        </div>

        {!canWrite && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("readOnlyNotice")}
          </div>
        )}

        {/* Monthly summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("summary.monthOrders")}</span>
            </div>
            <p className="text-lg font-semibold">{formatAmount(monthlyOrdersTotal)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("summary.monthExpenses")}</span>
            </div>
            <p className="text-lg font-semibold">{formatAmount(monthlyExpensesTotal)}</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map(({ key, labelKey, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {icon}
              <span className="hidden sm:inline">{t(labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "orders" && (
          <PurchaseOrderList
            initialOrders={initialOrders}
            suppliers={initialSuppliers}
            restaurantCurrency={restaurantCurrency}
            monthStart={monthStart}
            monthEnd={monthEnd}
            canWrite={canWrite}
          />
        )}
        {activeTab === "expenses" && (
          <ExpenseList
            initialExpenses={initialExpenses}
            restaurantCurrency={restaurantCurrency}
            monthStart={monthStart}
            monthEnd={monthEnd}
            canWrite={canWrite}
          />
        )}
        {activeTab === "suppliers" && (
          <SupplierList initialSuppliers={initialSuppliers} canWrite={canWrite} />
        )}
      </div>
    </div>
  );
}
