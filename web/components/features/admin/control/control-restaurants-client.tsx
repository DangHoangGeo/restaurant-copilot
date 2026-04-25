"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  UtensilsCrossed,
} from "lucide-react";
import { AddBranchModal } from "@/components/features/admin/branches/AddBranchModal";
import { BranchScopedLinkButton } from "@/components/features/admin/control/branch-scoped-link-button";
import { OwnerBranchExpenseDialog } from "@/components/features/admin/control/owner-branch-expense-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FounderControlOverviewData } from "@/lib/server/control/overview";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  subdomain: string;
  branchCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  employeeCount?: number;
  isActive?: boolean;
  onboarded?: boolean;
}

interface ControlRestaurantsClientProps {
  branches: Branch[];
  overview: FounderControlOverviewData;
  canAddBranch: boolean;
  companyPublicSubdomain: string | null;
  currency: string;
}

function fmt(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function SignalCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "copper" | "herb";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-3",
        tone === "copper"
          ? "border-[#C8773E]/25 bg-[#FFF7E9]"
          : tone === "herb"
            ? "border-[#97BE73]/25 bg-[#FCFFF7]"
            : "border-[#C8773E]/14 bg-[#FFFDF8]",
      )}
    >
      <p className="text-[11px] font-medium text-[#7A5D45]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-[#24170F]">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-[#7A5D45]">{hint}</p>
    </div>
  );
}

export function ControlRestaurantsClient({
  branches: initialBranches,
  overview,
  canAddBranch,
  companyPublicSubdomain,
  currency,
}: ControlRestaurantsClientProps) {
  const locale = useLocale();
  const t = useTranslations("owner.branches");
  const tPurchasing = useTranslations("owner.purchasing");
  const router = useRouter();
  const [branches] = useState(initialBranches);
  const [showAddBranch, setShowAddBranch] = useState(false);

  const handleBranchAdded = () => {
    setShowAddBranch(false);
    router.refresh();
  };

  const monthLabel = `${overview.current_month.year}/${String(
    overview.current_month.month,
  ).padStart(2, "0")}`;
  const setupNeededCount = branches.filter(
    (branch) => !branch.onboarded,
  ).length;
  const overviewBranchById = new Map(
    overview.branches.map((branch) => [branch.restaurant_id, branch]),
  );
  const alerts = [
    setupNeededCount > 0
      ? t("workspace.alerts.setupNeeded", { count: setupNeededCount })
      : null,
    overview.attention.branches_missing_snapshot > 0
      ? t("workspace.alerts.monthCloseNeeded", {
          count: overview.attention.branches_missing_snapshot,
        })
      : null,
    overview.attention.branches_with_open_orders > 0
      ? t("workspace.alerts.openOrders", {
          count: overview.attention.branches_with_open_orders,
        })
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-[30px] bg-[#14100B] p-5 text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/18">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9A35E]">
              Setup
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              Branch network
            </h1>
            <p className="mt-1 text-sm text-[#C9B7A0]">
              {branches.length} {branches.length === 1 ? "branch" : "branches"}{" "}
              in this company
            </p>
          </div>
          {canAddBranch ? (
            <Button
              type="button"
              className="h-11 rounded-2xl bg-[#C8773E] text-white hover:bg-[#A95F2F]"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              {t("addBranch")}
            </Button>
          ) : null}
        </div>
      </header>

      {alerts.length > 0 ? (
        <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-amber-950">
                Needs owner attention
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {alerts.map((alert) => (
                  <span
                    key={alert}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-800"
                  >
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-3">
        <SignalCard
          label={t("workspace.stats.todayRevenue")}
          value={fmt(overview.total_today_revenue, currency, locale)}
          hint={t("workspace.stats.todayRevenueHint", {
            count: overview.total_open_orders,
          })}
          tone="herb"
        />
        <SignalCard
          label={t("workspace.openOrdersCount", {
            count: overview.total_open_orders,
          })}
          value={String(overview.total_open_orders)}
          hint={`${overview.attention.branches_with_open_orders} branch${overview.attention.branches_with_open_orders === 1 ? "" : "es"}`}
          tone="copper"
        />
        <SignalCard
          label={t("workspace.stats.monthClose", { month: monthLabel })}
          value={`${overview.current_month.branches_with_snapshot}/${overview.current_month.branch_count}`}
          hint={fmt(overview.current_month.revenue_total, currency, locale)}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-auto justify-start rounded-[22px] border-[#C8773E]/16 bg-[#FFFDF8] p-4 text-left text-[#24170F] hover:bg-[#FFF7E9]"
          onClick={() => router.push(`/${locale}/control/menu`)}
        >
          <UtensilsCrossed className="mr-3 h-5 w-5 text-[#A95F2F]" />
          <span>
            <span className="block text-sm font-semibold">
              Company menu foundation
            </span>
            <span className="block text-xs font-normal text-[#7A5D45]">
              Shared categories and inherited dishes
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto justify-start rounded-[22px] border-[#C8773E]/16 bg-[#FFFDF8] p-4 text-left text-[#24170F] hover:bg-[#FFF7E9]"
          onClick={() => router.push(`/${locale}/control/finance`)}
        >
          <ReceiptText className="mr-3 h-5 w-5 text-[#A95F2F]" />
          <span>
            <span className="block text-sm font-semibold">Branch finance</span>
            <span className="block text-xs font-normal text-[#7A5D45]">
              Expenses, month close, and report review
            </span>
          </span>
        </Button>
      </section>

      {branches.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-[#D8B993] bg-[#FFFDF8] px-4 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-[#AB6E3C]" />
          <p className="mt-3 text-sm font-semibold text-[#24170F]">
            {t("workspace.emptyTitle")}
          </p>
          {canAddBranch ? (
            <Button
              type="button"
              size="sm"
              className="mt-4 rounded-xl bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              {t("addBranch")}
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {branches.map((branch) => {
            const branchOverview = overviewBranchById.get(branch.id);
            const openOrders = branchOverview?.open_orders_count ?? 0;
            const todayRevenue = branchOverview?.today_revenue ?? 0;
            const monthlySpending = branchOverview?.monthly_spending ?? 0;

            return (
              <article
                key={branch.id}
                className="rounded-[26px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C8773E]/12 text-[#A95F2F]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-[#24170F]">
                        {branch.name}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-[#7A5D45]">
                        {branch.branchCode ?? branch.subdomain}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 rounded-full",
                      branch.onboarded
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    {branch.onboarded
                      ? t("workspace.ready")
                      : t("workspace.setupNeeded")}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-[#6F563E]">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A95F2F]" />
                    <span className="line-clamp-2">
                      {branch.address ?? t("workspace.addressNotSet")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {branch.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#A95F2F]" />
                        {branch.phone}
                      </span>
                    ) : null}
                    {branch.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#A95F2F]" />
                        {branch.email}
                      </span>
                    ) : null}
                    {!branch.phone && !branch.email ? (
                      <span>{t("workspace.contactNotSet")}</span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-[#F6E8D3] px-3 py-2">
                    <p className="text-[11px] text-[#7A5D45]">Today</p>
                    <p className="mt-1 truncate text-xs font-semibold tabular-nums text-[#24170F]">
                      {fmt(todayRevenue, currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F6E8D3] px-3 py-2">
                    <p className="text-[11px] text-[#7A5D45]">Orders</p>
                    <p className="mt-1 text-xs font-semibold tabular-nums text-[#24170F]">
                      {openOrders}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F6E8D3] px-3 py-2">
                    <p className="text-[11px] text-[#7A5D45]">Spend</p>
                    <p className="mt-1 truncate text-xs font-semibold tabular-nums text-[#24170F]">
                      {fmt(monthlySpending, currency, locale)}
                    </p>
                  </div>
                </div>

                {branchOverview?.has_closed_snapshot ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#FCFFF7] px-3 py-2 text-xs text-[#55763F]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("workspace.monthClosed")}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl border-[#C8773E]/20 bg-white text-[#6F563E]"
                    onClick={() =>
                      router.push(`/${locale}/control/restaurants/${branch.id}`)
                    }
                  >
                    {t("workspace.actions.ownerView")}
                  </Button>
                  <OwnerBranchExpenseDialog
                    branchId={branch.id}
                    branchName={branch.name}
                    currency={currency}
                    label={tPurchasing("addExpense")}
                    className="flex-1 rounded-xl border-[#C8773E]/20 bg-white text-[#6F563E]"
                  />
                  <BranchScopedLinkButton
                    restaurantId={branch.id}
                    href={`/${locale}/branch/${branch.id}`}
                    label={t("workspace.actions.branchManage")}
                    size="sm"
                    className="flex-1 rounded-xl bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                    openInNewTab
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showAddBranch ? (
        <AddBranchModal
          companyPublicSubdomain={companyPublicSubdomain}
          onClose={() => setShowAddBranch(false)}
          onSuccess={handleBranchAdded}
        />
      ) : null}
    </div>
  );
}
