"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Clock,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Lock,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  ReceiptPercent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthlyFinanceReport, MonthlyFinanceSnapshot } from "@/lib/server/finance/types";
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
}: FinanceDashboardProps) {
  const t = useTranslations("owner.finance");
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "JPY",
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(n);

  const fmtHours = (h: number) => `${h.toFixed(1)}h`;

  const d = report?.data;
  const isClosed =
    report?.kind === "snapshot" && report.data.snapshot_status === "closed";
  const isLive = report?.kind === "live";

  // Month navigation
  function navigateMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    startTransition(() => {
      router.push(`?year=${y}&month=${m}`);
    });
  }

  // Close month
  async function handleCloseMonth() {
    setClosing(true);
    setCloseError(null);
    try {
      const res = await fetch("/api/v1/owner/finance/monthly/close", {
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

  // Export CSV
  async function handleExport() {
    setExporting(true);
    try {
      const url = `/api/v1/owner/finance/monthly/export?year=${year}&month=${month}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(t("exportError"));
      const blob = await res.blob();
      const mm = String(month).padStart(2, "0");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `finance_${year}_${mm}_${restaurantName}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  const periodLabel = d
    ? `${d.year} / ${String(d.month).padStart(2, "0")}`
    : `${year} / ${String(month).padStart(2, "0")}`;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("pageDescription")}</p>
          </div>
        </div>

        <MoneySectionNav locale={locale} />

        {/* Month navigator */}
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <button
            onClick={() => navigateMonth(-1)}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold">{periodLabel}</p>
            <p className="text-xs text-muted-foreground">
              {isClosed ? (
                <span className="inline-flex items-center gap-1 text-green-600">
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
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40"
            aria-label={t("nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* No data */}
        {!d && (
          <div className="rounded-xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        )}

        {d && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Revenue */}
              <SummaryCard
                icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                label={t("revenue")}
                primary={fmt(d.revenue_total)}
                secondary={t("orderCount", { count: d.order_count })}
                highlight="green"
              />

              {/* Gross Profit */}
              <SummaryCard
                icon={
                  d.gross_profit_estimate >= 0
                    ? <TrendingUp className="h-4 w-4 text-blue-600" />
                    : <TrendingDown className="h-4 w-4 text-red-500" />
                }
                label={t("grossProfit")}
                primary={fmt(d.gross_profit_estimate)}
                secondary={t("grossProfitHint")}
                highlight={d.gross_profit_estimate >= 0 ? "blue" : "red"}
              />

              {/* Total Costs */}
              <SummaryCard
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                label={t("totalCosts")}
                primary={fmt(d.combined_cost_total)}
                secondary={
                  `${t("orders")} ${fmt(d.purchasing_total)} + ${t("expenses")} ${fmt(d.expense_total)}`
                }
              />

              {/* Labor */}
              <SummaryCard
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                label={t("laborHours")}
                primary={fmtHours(d.approved_labor_hours)}
                secondary={t("laborEntries", { count: d.labor_entry_count })}
              />
            </div>

            {/* Purchasing breakdown */}
            <div className="rounded-xl border bg-card divide-y text-sm">
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-muted-foreground">{t("grossSales")}</span>
                <span className="font-medium">{fmt(d.revenue_total)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ReceiptPercent className="h-3.5 w-3.5" />
                  {t("discounts")}
                </span>
                <span className="font-medium text-amber-600">
                  -{fmt(d.discount_total)}
                </span>
              </div>
              <div className="px-4 py-2.5 flex justify-between font-semibold">
                <span>{t("netRevenue")}</span>
                <span>{fmt(d.revenue_total - d.discount_total)}</span>
              </div>
            </div>

            {/* Purchasing breakdown */}
            <div className="rounded-xl border bg-card divide-y text-sm">
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {t("purchaseOrders")}
                </span>
                <span className="font-medium">{fmt(d.purchasing_total)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-muted-foreground">{t("otherExpenses")}</span>
                <span className="font-medium">{fmt(d.expense_total)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between font-semibold">
                <span>{t("combinedCosts")}</span>
                <span>{fmt(d.combined_cost_total)}</span>
              </div>
            </div>

            {/* Live-data notice */}
            {isLive && (
              <p className="text-xs text-muted-foreground px-1">
                {t("liveNotice")}
              </p>
            )}

            {/* Closed-snapshot notes */}
            {isClosed && report.kind === "snapshot" && report.data.notes && (
              <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-0.5">{t("notes")}</p>
                <p>{report.data.notes}</p>
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Export */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 flex-1"
              >
                <Download className="h-4 w-4" />
                {exporting ? t("exporting") : t("exportCsv")}
              </button>

              {/* Close month (owner only, not yet closed) */}
              {canClose && !isClosed && (
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex-1"
                >
                  <Lock className="h-4 w-4" />
                  {t("closeMonth")}
                </button>
              )}
            </div>
          </>
        )}

        {/* Close confirmation dialog */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-background p-6 space-y-4 shadow-xl">
              <h2 className="text-base font-semibold">{t("closeConfirmTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("closeConfirmBody", { period: periodLabel })}</p>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                className="w-full rounded-lg border bg-muted/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {closeError && (
                <p className="text-xs text-destructive">{closeError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCloseConfirm(false); setCloseError(null); }}
                  disabled={closing}
                  className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleCloseMonth}
                  disabled={closing}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {closing ? t("closing") : t("confirmClose")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent snapshots */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              {t("recentSnapshots")}
            </p>
            <div className="rounded-xl border bg-card divide-y text-sm">
              {history.map((snap) => (
                <button
                  key={snap.id}
                  onClick={() =>
                    router.push(`?year=${snap.year}&month=${snap.month}`)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left"
                >
                  <div>
                    <span className="font-medium">
                      {snap.year} / {String(snap.month).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        snap.snapshot_status === "closed"
                          ? "text-green-600"
                          : "text-amber-600"
                      )}
                    >
                      {snap.snapshot_status === "closed" ? t("statusClosed") : t("statusDraft")}
                    </span>
                  </div>
                    <span className="text-muted-foreground">
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: snap.currency || "JPY",
                      maximumFractionDigits: 0,
                    }).format(snap.revenue_total)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
  highlight?: "green" | "blue" | "red";
}

function SummaryCard({ icon, label, primary, secondary, highlight }: SummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p
        className={cn(
          "text-base font-bold",
          highlight === "green" && "text-green-600",
          highlight === "blue"  && "text-blue-600",
          highlight === "red"   && "text-red-500"
        )}
      >
        {primary}
      </p>
      {secondary && (
        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
      )}
    </div>
  );
}
