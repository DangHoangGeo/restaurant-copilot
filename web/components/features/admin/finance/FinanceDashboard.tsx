"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Clock,
  DollarSign,
  Download,
  FileText,
  Lock,
  Percent,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
} from "@/lib/server/finance/types";
import { MoneySectionNav } from "@/components/features/admin/money/MoneySectionNav";

interface FinanceDashboardProps {
  year: number;
  month: number;
  report: MonthlyFinanceReport | null;
  history: MonthlyFinanceSnapshot[];
  currency: string;
  locale: string;
  restaurantName: string;
  canClose: boolean;
  canExport?: boolean;
  canViewIncome?: boolean;
  canViewSpending?: boolean;
  financeHref?: string;
  hidePageChrome?: boolean;
  embedded?: boolean;
  navigationPath?: string;
  navigationParams?: Record<string, string>;
  apiBasePath?: string;
}

export function FinanceDashboard({
  year,
  month,
  report,
  history,
  currency,
  locale,
  restaurantName,
  canClose,
  canExport = true,
  canViewIncome = true,
  canViewSpending = true,
  financeHref,
  hidePageChrome = false,
  embedded = false,
  navigationPath,
  navigationParams,
  apiBasePath = "/api/v1/owner/finance/monthly",
}: FinanceDashboardProps) {
  const t = useTranslations("owner.finance");
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fmt = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "JPY",
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(value);

  const fmtHours = (hours: number) => `${hours.toFixed(1)}h`;

  const data = report?.data;
  const isClosed =
    report?.kind === "snapshot" && report.data.snapshot_status === "closed";
  const isLive = report?.kind === "live";
  const periodLabel = data
    ? `${data.year} / ${String(data.month).padStart(2, "0")}`
    : `${year} / ${String(month).padStart(2, "0")}`;

  function defaultExportFilename(): string {
    const mm = String(month).padStart(2, "0");
    const safeName =
      restaurantName.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "branch";
    return `finance_${year}_${mm}_${safeName}.csv`;
  }

  function buildNavigationUrl(targetYear: number, targetMonth: number): string {
    if (!navigationPath) {
      return `?year=${targetYear}&month=${targetMonth}`;
    }

    const params = new URLSearchParams(navigationParams);
    params.set("year", String(targetYear));
    params.set("month", String(targetMonth));
    return `${navigationPath}?${params.toString()}`;
  }

  function navigateMonth(delta: number) {
    let targetYear = year;
    let targetMonth = month + delta;

    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    }
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }

    startTransition(() => {
      router.push(buildNavigationUrl(targetYear, targetMonth));
    });
  }

  async function handleCloseMonth() {
    setClosing(true);
    setCloseError(null);
    try {
      const res = await fetch(`${apiBasePath}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, notes: closeNotes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("closeError"));
      }
      setShowCloseConfirm(false);
      router.refresh();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : t("closeError"));
    } finally {
      setClosing(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const url = `${apiBasePath}/export?year=${year}&month=${month}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("exportError"));
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] ?? defaultExportFilename();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  const summaryCards: SummaryCardProps[] = [];

  if (data && canViewIncome) {
    summaryCards.push(
      {
        icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
        label: t("revenue"),
        primary: fmt(data.revenue_total),
        secondary: t("orderCount", { count: data.order_count }),
        highlight: "green",
      },
      {
        icon: <Percent className="h-4 w-4 text-amber-600" />,
        label: t("discounts"),
        primary: fmt(data.discount_total),
        secondary: t("ledger.income.discountHint"),
        highlight: "amber",
      },
      {
        icon: <DollarSign className="h-4 w-4 text-slate-600" />,
        label: t("netRevenue"),
        primary: fmt(data.revenue_total - data.discount_total),
      },
    );
  }

  if (data && canViewSpending) {
    summaryCards.push(
      {
        icon: <ShoppingBag className="h-4 w-4 text-slate-600" />,
        label: t("purchaseOrders"),
        primary: fmt(data.purchasing_total),
      },
      {
        icon: <DollarSign className="h-4 w-4 text-rose-600" />,
        label: t("otherExpenses"),
        primary: fmt(data.expense_total),
      },
      {
        icon: <TrendingDown className="h-4 w-4 text-slate-600" />,
        label: t("totalCosts"),
        primary: fmt(data.combined_cost_total),
        secondary: t("ledger.spending.totalCostsHint"),
      },
    );
  }

  if (data && canViewIncome && canViewSpending) {
    summaryCards.push(
      {
        icon:
          data.gross_profit_estimate >= 0 ? (
            <TrendingUp className="h-4 w-4 text-sky-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-600" />
          ),
        label: t("grossProfit"),
        primary: fmt(data.gross_profit_estimate),
        secondary: t("grossProfitHint"),
        highlight: data.gross_profit_estimate >= 0 ? "blue" : "red",
      },
      {
        icon: <Clock className="h-4 w-4 text-slate-600" />,
        label: t("laborHours"),
        primary: fmtHours(data.approved_labor_hours),
        secondary: t("laborEntries", { count: data.labor_entry_count }),
      },
    );
  }

  const wrapperClassName = embedded
    ? "space-y-4"
    : "container mx-auto px-4 py-8 sm:px-6 lg:px-8";
  const contentClassName = embedded
    ? "space-y-4"
    : "mx-auto max-w-4xl space-y-6";

  return (
    <div className={wrapperClassName}>
      <div className={contentClassName}>
        {!hidePageChrome ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
                <p className="text-xs text-muted-foreground">
                  {t("pageDescription")}
                </p>
              </div>
            </div>

            <MoneySectionNav locale={locale} financeHref={financeHref} />
          </>
        ) : null}

        {data && summaryCards.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={`${card.label}-${card.primary}`} {...card} />
            ))}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-border bg-card p-4 text-card-foreground">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3 lg:min-w-[260px]">
              <button
                onClick={() => navigateMonth(-1)}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label={t("prevMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {periodLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isClosed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Lock className="h-3 w-3" />
                      {t("statusClosed")}
                    </span>
                  ) : (
                    <span className="text-amber-600">{t("statusLive")}</span>
                  )}
                </p>
              </div>

              <button
                onClick={() => navigateMonth(1)}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {canExport ? (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? t("exporting") : t("exportCsv")}
                </button>
              ) : null}

              {canClose && !isClosed ? (
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Lock className="h-4 w-4" />
                  {t("closeMonth")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {!data ? (
          <div className="rounded-[24px] border border-dashed border-border bg-muted/55 px-6 py-10 text-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {canViewIncome ? (
                <div className="overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("ledger.income.title")}
                    </p>
                  </div>
                  <div className="divide-y divide-border text-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-muted-foreground">
                        {t("grossSales")}
                      </span>
                      <span className="font-medium text-foreground">
                        {fmt(data.revenue_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Percent className="h-3.5 w-3.5" />
                        {t("discounts")}
                      </span>
                      <span className="font-medium text-amber-600">
                        -{fmt(data.discount_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 font-semibold">
                      <span className="text-foreground">{t("netRevenue")}</span>
                      <span className="text-foreground">
                        {fmt(data.revenue_total - data.discount_total)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {canViewSpending ? (
                <div className="overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("ledger.spending.title")}
                    </p>
                  </div>
                  <div className="divide-y divide-border text-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {t("purchaseOrders")}
                      </span>
                      <span className="font-medium text-foreground">
                        {fmt(data.purchasing_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-muted-foreground">
                        {t("otherExpenses")}
                      </span>
                      <span className="font-medium text-foreground">
                        {fmt(data.expense_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 font-semibold">
                      <span className="text-foreground">
                        {t("combinedCosts")}
                      </span>
                      <span className="text-foreground">
                        {fmt(data.combined_cost_total)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {isLive ? (
              <p className="px-1 text-xs text-muted-foreground">
                {t("liveNotice")}
              </p>
            ) : null}

            {isClosed &&
            report?.kind === "snapshot" &&
            report.data.notes &&
            (canExport || canClose) ? (
              <div className="rounded-[24px] border border-border bg-muted/55 px-4 py-3 text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">{t("notes")}</p>
                <p>{report.data.notes}</p>
              </div>
            ) : null}
          </>
        )}

        {history.length > 0 ? (
          <div className="space-y-2">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("recentSnapshots")}
            </p>
            <div className="overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground">
              {history.map((snapshot) => (
                <button
                  key={snapshot.id}
                  onClick={() =>
                    router.push(
                      buildNavigationUrl(snapshot.year, snapshot.month),
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 border-b border-border px-4 py-3 text-left text-sm transition hover:bg-muted last:border-b-0"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {snapshot.year} /{" "}
                      {String(snapshot.month).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        snapshot.snapshot_status === "closed"
                          ? "text-emerald-600"
                          : "text-amber-600",
                      )}
                    >
                      {snapshot.snapshot_status === "closed"
                        ? t("statusClosed")
                        : t("statusDraft")}
                    </span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {canViewIncome
                      ? new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: snapshot.currency || "JPY",
                          maximumFractionDigits: 0,
                        }).format(snapshot.revenue_total)
                      : new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: snapshot.currency || "JPY",
                          maximumFractionDigits: 0,
                        }).format(snapshot.combined_cost_total)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showCloseConfirm ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-sm space-y-4 rounded-[24px] bg-background p-6 shadow-xl">
              <h2 className="text-base font-semibold">
                {t("closeConfirmTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("closeConfirmBody", { period: periodLabel })}
              </p>
              <textarea
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                className="w-full resize-none rounded-xl border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {closeError ? (
                <p className="text-xs text-destructive">{closeError}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCloseConfirm(false);
                    setCloseError(null);
                  }}
                  disabled={closing}
                  className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleCloseMonth}
                  disabled={closing}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {closing ? t("closing") : t("confirmClose")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  primary: string;
  secondary?: string;
  highlight?: "green" | "blue" | "red" | "amber";
}

function SummaryCard({
  icon,
  label,
  primary,
  secondary,
  highlight,
}: SummaryCardProps) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-semibold text-foreground",
          highlight === "green" && "text-emerald-600",
          highlight === "blue" && "text-sky-600",
          highlight === "red" && "text-rose-600",
          highlight === "amber" && "text-amber-600",
        )}
      >
        {primary}
      </p>
      {secondary ? (
        <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
      ) : null}
    </div>
  );
}
