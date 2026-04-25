"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Plus } from "lucide-react";
import { AddBranchModal } from "@/components/features/admin/branches/AddBranchModal";
import { BranchScopedLinkButton } from "@/components/features/admin/control/branch-scoped-link-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FounderControlOverviewData } from "@/lib/server/control/overview";

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

function formatCurrency(amount: number, currency: string, locale: string) {
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

function MetricStrip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 border-l border-[#F1DCC4]/14 px-4 first:border-l-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-[#FFF7E9]">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-[#C9B7A0]">{hint}</p>
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
  const router = useRouter();
  const [branches] = useState(initialBranches);
  const [showAddBranch, setShowAddBranch] = useState(false);

  const monthLabel = `${overview.current_month.year}/${String(
    overview.current_month.month,
  ).padStart(2, "0")}`;
  const setupNeededCount = branches.filter(
    (branch) => !branch.onboarded,
  ).length;
  const branchRows = useMemo(
    () =>
      [...branches].sort((left, right) => left.name.localeCompare(right.name)),
    [branches],
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

  const handleBranchAdded = () => {
    setShowAddBranch(false);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="overflow-hidden rounded-xl bg-[#14100B] text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/18">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9A35E]">
              {t("workspace.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {t("workspace.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#C9B7A0]">
              {t("workspace.description", { count: branches.length })}
            </p>
          </div>
          {canAddBranch ? (
            <Button
              type="button"
              className="h-10 rounded-lg bg-[#C8773E] text-white hover:bg-[#A95F2F]"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              {t("addBranch")}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-y-4 border-t border-[#F1DCC4]/10 bg-[#FFF7E9]/[0.04] py-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricStrip
            label={t("workspace.stats.monthRevenue")}
            value={formatCurrency(
              overview.current_month.revenue_total,
              currency,
              locale,
            )}
            hint={t("workspace.stats.monthRevenueHint", { month: monthLabel })}
          />
          <MetricStrip
            label={t("workspace.stats.totalExpenses")}
            value={formatCurrency(
              overview.current_month.combined_cost_total,
              currency,
              locale,
            )}
            hint={t("workspace.stats.totalExpensesHint")}
          />
          <MetricStrip
            label={t("workspace.stats.grossProfit")}
            value={formatCurrency(
              overview.current_month.gross_profit_estimate,
              currency,
              locale,
            )}
            hint={t("workspace.stats.monthClose", { month: monthLabel })}
          />
          <MetricStrip
            label={t("workspace.stats.openOrders")}
            value={String(overview.total_open_orders)}
            hint={t("workspace.stats.openOrdersHint", {
              count: overview.attention.branches_with_open_orders,
            })}
          />
        </div>
      </header>

      {alerts.length > 0 ? (
        <section className="rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-4 text-[#FFF7E9] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9A35E]/16 text-[#F2B36F]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {t("workspace.alertsTitle")}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {alerts.map((alert) => (
                  <span
                    key={alert}
                    className="rounded-full bg-[#FFF7E9]/10 px-3 py-1.5 text-xs font-medium text-[#F1DCC4]"
                  >
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {branches.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[#D8B993]/35 bg-[#FFF7E9]/[0.075] px-4 py-12 text-center text-[#FFF7E9] backdrop-blur-xl">
          <Building2 className="mx-auto h-8 w-8 text-[#E9A35E]" />
          <p className="mt-3 text-sm font-semibold">
            {t("workspace.emptyTitle")}
          </p>
          {canAddBranch ? (
            <Button
              type="button"
              size="sm"
              className="mt-4 rounded-lg bg-[#C8773E] text-white hover:bg-[#A95F2F]"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              {t("addBranch")}
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-[#F1DCC4]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                {t("workspace.tableTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-[#C9B7A0]">
                {t("workspace.tableHint")}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#F1DCC4]/10 hover:bg-transparent">
                  <TableHead className="min-w-[220px] px-4 py-3 text-[#B89078]">
                    {t("workspace.table.branch")}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-[#B89078]">
                    {t("workspace.table.code")}
                  </TableHead>
                  <TableHead className="min-w-[240px] px-4 py-3 text-right text-[#B89078]">
                    {t("workspace.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchRows.map((branch) => {
                  return (
                    <TableRow
                      key={branch.id}
                      className="border-[#F1DCC4]/10 hover:bg-[#FFF7E9]/[0.055]"
                    >
                      <TableCell className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/${locale}/control/restaurants/${branch.id}`,
                            )
                          }
                          className="group flex min-w-0 items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF7E9]/10 text-[#E9A35E]">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-[#FFF7E9] group-hover:text-[#F2B36F]">
                                {branch.name}
                              </span>
                            </span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm tabular-nums text-[#C9B7A0]">
                        {branch.branchCode ?? branch.subdomain}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg bg-[#C8773E] text-white hover:bg-[#A95F2F]"
                            onClick={() =>
                              router.push(
                                `/${locale}/control/restaurants/${branch.id}`,
                              )
                            }
                          >
                            {t("workspace.actions.ownerView")}
                          </Button>
                          <BranchScopedLinkButton
                            restaurantId={branch.id}
                            href={`/${locale}/branch/${branch.id}`}
                            label={t("workspace.actions.branchManage")}
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
                            openInNewTab
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
