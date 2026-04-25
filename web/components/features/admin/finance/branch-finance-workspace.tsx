"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import { OwnerBranchExpenseDialog } from "@/components/features/admin/control/owner-branch-expense-dialog";
import { OwnerBranchPurchaseOrderDialog } from "@/components/features/admin/control/owner-branch-purchase-order-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
} from "@/lib/server/finance/types";
import type {
  BranchFinanceDetailData,
  BranchFinanceRecentExpense,
  BranchFinanceRecentPurchase,
} from "@/lib/server/control/branch-finance-detail";

interface BranchFinanceWorkspaceProps {
  branchId: string;
  branchName: string;
  locale: string;
  controlPath: string;
  currency: string;
  year: number;
  month: number;
  report: MonthlyFinanceReport | null;
  history: MonthlyFinanceSnapshot[];
  detail: BranchFinanceDetailData | null;
  canExport: boolean;
  canClose: boolean;
  canViewIncome: boolean;
  canViewSpending: boolean;
  canManageExpenses: boolean;
}

type LedgerType = "all" | "income" | "expense" | "purchase";

interface LedgerRow {
  id: string;
  type: Exclude<LedgerType, "all">;
  date: string;
  category: string;
  description: string;
  counterparty: string;
  recordedBy: string | null;
  amount: number;
  currency: string;
  deletableExpenseId?: string;
}

const TYPE_OPTIONS: LedgerType[] = ["all", "income", "expense", "purchase"];

function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
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

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

function toCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv",
) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function MetricLine({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 border-l border-[#F1DCC4]/12 px-4 first:border-l-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-[#FFF7E9]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-xs text-[#C9B7A0]">{hint}</p>
      ) : null}
    </div>
  );
}

export function BranchFinanceWorkspace({
  branchId,
  branchName,
  locale,
  currency,
  year,
  month,
  report,
  history,
  detail,
  canExport,
  canViewIncome,
  canViewSpending,
  canManageExpenses,
}: BranchFinanceWorkspaceProps) {
  const t = useTranslations("owner.finance");
  const tPurchasing = useTranslations("owner.purchasing");
  const router = useRouter();
  const [recentExpenses, setRecentExpenses] = useState(
    detail?.recentExpenses ?? [],
  );
  const [recentPurchases, setRecentPurchases] = useState(
    detail?.recentPurchases ?? [],
  );
  const [typeFilter, setTypeFilter] = useState<LedgerType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<BranchFinanceRecentExpense | null>(null);
  const data = report?.data ?? null;
  const periodLabel = `${year}/${String(month).padStart(2, "0")}`;
  const previousSnapshot = history.find(
    (snapshot) =>
      snapshot.year < year ||
      (snapshot.year === year && snapshot.month < month),
  );
  const revenueDelta =
    previousSnapshot && data
      ? data.revenue_total - previousSnapshot.revenue_total
      : null;

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = [];

    if (canViewIncome) {
      for (const sale of detail?.recentSales ?? []) {
        rows.push({
          id: `income-${sale.id}`,
          type: "income",
          date: sale.created_at,
          category: t("branchLedger.categories.sales"),
          description: `#${sale.id.slice(0, 8)}`,
          counterparty: sale.table_name ?? t("ledger.income.walkIn"),
          recordedBy: null,
          amount: sale.total_amount,
          currency,
        });
      }
    }

    if (canViewSpending) {
      for (const expense of recentExpenses) {
        rows.push({
          id: `expense-${expense.id}`,
          type: "expense",
          date: expense.expense_date,
          category: tPurchasing(`expenseCategories.${expense.category}`),
          description: expense.description,
          counterparty: expense.notes ?? t("branchLedger.noCounterparty"),
          recordedBy: expense.created_by_name,
          amount: -expense.amount,
          currency: expense.currency || currency,
          deletableExpenseId: expense.id,
        });
      }

      for (const purchase of recentPurchases) {
        rows.push({
          id: `purchase-${purchase.id}`,
          type: "purchase",
          date: purchase.order_date,
          category: tPurchasing(`categories.${purchase.category}`),
          description: purchase.supplier_name ?? tPurchasing("unknownSupplier"),
          counterparty: `${tPurchasing(`orderStatus.${purchase.status}`)} / ${tPurchasing(
            purchase.is_paid ? "paid" : "unpaid",
          )}`,
          recordedBy: purchase.created_by_name,
          amount: -purchase.total_amount,
          currency: purchase.currency || currency,
        });
      }
    }

    return rows.sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }, [
    canViewIncome,
    canViewSpending,
    currency,
    detail?.recentSales,
    recentPurchases,
    recentExpenses,
    t,
    tPurchasing,
  ]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(ledgerRows.map((row) => row.category)),
    );
    return categories.sort((left, right) => left.localeCompare(right));
  }, [ledgerRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ledgerRows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }
      if (fromDate && row.date.slice(0, 10) < fromDate) return false;
      if (toDate && row.date.slice(0, 10) > toDate) return false;
      if (!query) return true;
      return [row.description, row.category, row.counterparty, row.recordedBy]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [categoryFilter, fromDate, ledgerRows, search, toDate, typeFilter]);

  const filteredIncome = filteredRows
    .filter((row) => row.amount > 0)
    .reduce((sum, row) => sum + row.amount, 0);
  const filteredSpend = filteredRows
    .filter((row) => row.amount < 0)
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const filteredNet = filteredIncome - filteredSpend;
  const margin =
    data && data.revenue_total > 0
      ? (data.gross_profit_estimate / data.revenue_total) * 100
      : 0;

  const handleExpenseCreated = (expense: BranchFinanceRecentExpense) => {
    setRecentExpenses((current) => [expense, ...current].slice(0, 20));
    router.refresh();
  };

  const handlePurchaseCreated = (purchase: BranchFinanceRecentPurchase) => {
    setRecentPurchases((current) => [purchase, ...current].slice(0, 20));
    router.refresh();
  };

  const handleExpenseDelete = async () => {
    if (!pendingDelete) return;
    const expenseId = pendingDelete.id;
    const res = await fetch(
      `/api/v1/owner/organization/restaurants/${branchId}/purchasing/expenses/${expenseId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setRecentExpenses((current) =>
        current.filter((expense) => expense.id !== expenseId),
      );
      setPendingDelete(null);
      router.refresh();
    }
  };

  const handleMonthlyExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/finance/monthly/export?year=${year}&month=${month}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("exportError"));
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      const filename =
        filenameMatch?.[1] ??
        `finance_${year}_${String(month).padStart(2, "0")}_${branchName}.csv`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleFilteredExport = () => {
    const header = [
      "date",
      "type",
      "category",
      "description",
      "counterparty",
      "recorded_by",
      "amount",
    ];
    const body = filteredRows.map((row) =>
      [
        row.date.slice(0, 10),
        row.type,
        row.category,
        row.description,
        row.counterparty,
        row.recordedBy ?? "",
        row.amount,
      ]
        .map(toCsvValue)
        .join(","),
    );
    downloadTextFile(
      `ledger_${year}_${String(month).padStart(2, "0")}_${branchName}.csv`,
      [header.join(","), ...body].join("\n"),
    );
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-[#F1DCC4]/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">{t("branchLedger.title")}</p>
            <p className="mt-0.5 text-xs text-[#C9B7A0]">
              {t("branchLedger.subtitle", { period: periodLabel })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageExpenses ? (
              <>
                <OwnerBranchPurchaseOrderDialog
                  branchId={branchId}
                  branchName={branchName}
                  currency={currency}
                  label={t("spending.addPurchaseOrderTitle")}
                  onCreated={handlePurchaseCreated}
                  className="rounded-lg bg-[#E9C27B] text-[#20150C] hover:bg-[#FFD991]"
                />
                <OwnerBranchExpenseDialog
                  branchId={branchId}
                  branchName={branchName}
                  currency={currency}
                  label={t("spending.addExpenseTitle")}
                  onCreated={handleExpenseCreated}
                  className="rounded-lg bg-[#C8773E] text-white hover:bg-[#A95F2F]"
                />
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
              onClick={handleFilteredExport}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("branchLedger.exportFiltered")}
            </Button>
            {canExport ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
                disabled={exporting}
                onClick={handleMonthlyExport}
              >
                <Download className="h-4 w-4" />
                {exporting ? t("exporting") : t("exportCsv")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-y-4 border-b border-[#F1DCC4]/10 bg-[#FFF7E9]/[0.04] py-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricLine
            label={t("revenue")}
            value={formatCurrency(data?.revenue_total ?? 0, currency, locale)}
            hint={
              revenueDelta == null
                ? t("branchLedger.noPrevious")
                : t("branchLedger.delta", {
                    amount: formatCurrency(revenueDelta, currency, locale),
                  })
            }
          />
          <MetricLine
            label={t("totalCosts")}
            value={formatCurrency(
              data?.combined_cost_total ?? 0,
              currency,
              locale,
            )}
            hint={t("ledger.spending.totalCostsHint")}
          />
          <MetricLine
            label={t("grossProfit")}
            value={formatCurrency(
              data?.gross_profit_estimate ?? 0,
              currency,
              locale,
            )}
            hint={t("branchLedger.margin", { percent: margin.toFixed(1) })}
          />
          <MetricLine
            label={t("branchLedger.filteredNet")}
            value={formatCurrency(filteredNet, currency, locale)}
            hint={t("branchLedger.filteredRows", {
              count: filteredRows.length,
            })}
          />
        </div>

        <div className="grid gap-3 border-b border-[#F1DCC4]/10 px-4 py-4 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C9B7A0]">
              {t("branchLedger.filters.search")}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B89078]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-lg border-[#F1DCC4]/18 bg-[#14100B]/50 pl-9 text-[#FFF7E9] placeholder:text-[#8F7762]"
                placeholder={t("branchLedger.filters.searchPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C9B7A0]">
              {t("branchLedger.filters.type")}
            </Label>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as LedgerType)}
            >
              <SelectTrigger className="h-10 rounded-lg border-[#F1DCC4]/18 bg-[#14100B]/50 text-[#FFF7E9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`branchLedger.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C9B7A0]">
              {t("branchLedger.filters.category")}
            </Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-lg border-[#F1DCC4]/18 bg-[#14100B]/50 text-[#FFF7E9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("branchLedger.filters.allCategories")}
                </SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C9B7A0]">
              {t("branchLedger.filters.from")}
            </Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-lg border-[#F1DCC4]/18 bg-[#14100B]/50 text-[#FFF7E9]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C9B7A0]">
              {t("branchLedger.filters.to")}
            </Label>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-lg border-[#F1DCC4]/18 bg-[#14100B]/50 text-[#FFF7E9]"
            />
          </div>
        </div>

        <div className="grid gap-y-4 border-b border-[#F1DCC4]/10 py-3 sm:grid-cols-3">
          <MetricLine
            label={t("branchLedger.filteredIncome")}
            value={formatCurrency(filteredIncome, currency, locale)}
          />
          <MetricLine
            label={t("branchLedger.filteredSpend")}
            value={formatCurrency(filteredSpend, currency, locale)}
          />
          <MetricLine
            label={t("branchLedger.filteredNet")}
            value={formatCurrency(filteredNet, currency, locale)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#F1DCC4]/10 hover:bg-transparent">
                <TableHead className="min-w-[120px] px-4 py-3 text-[#B89078]">
                  {t("branchLedger.table.date")}
                </TableHead>
                <TableHead className="px-4 py-3 text-[#B89078]">
                  {t("branchLedger.table.type")}
                </TableHead>
                <TableHead className="min-w-[180px] px-4 py-3 text-[#B89078]">
                  {t("branchLedger.table.category")}
                </TableHead>
                <TableHead className="min-w-[260px] px-4 py-3 text-[#B89078]">
                  {t("branchLedger.table.description")}
                </TableHead>
                <TableHead className="px-4 py-3 text-[#B89078]">
                  {t("branchLedger.table.recordedBy")}
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-[#B89078]">
                  {t("branchLedger.table.amount")}
                </TableHead>
                {canManageExpenses ? (
                  <TableHead className="px-4 py-3 text-right text-[#B89078]">
                    {t("spending.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="border-[#F1DCC4]/10">
                  <TableCell
                    colSpan={canManageExpenses ? 7 : 6}
                    className="px-4 py-10 text-center text-sm text-[#C9B7A0]"
                  >
                    {t("branchLedger.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-[#F1DCC4]/10 hover:bg-[#FFF7E9]/[0.055]"
                  >
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {formatDate(row.date, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#FFF7E9]">
                      {t(`branchLedger.types.${row.type}`)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {row.category}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-medium text-[#FFF7E9]">
                        {row.description}
                      </p>
                      <p className="mt-0.5 text-xs text-[#B89078]">
                        {row.counterparty}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {row.recordedBy ?? t("spending.unknownCreator")}
                    </TableCell>
                    <TableCell
                      className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                        row.amount >= 0 ? "text-[#B9D79B]" : "text-[#F2B36F]"
                      }`}
                    >
                      {formatCurrency(row.amount, row.currency, locale)}
                    </TableCell>
                    {canManageExpenses ? (
                      <TableCell className="px-4 py-3 text-right">
                        {row.deletableExpenseId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-[#C9B7A0] hover:bg-[#FFF7E9]/10 hover:text-[#F2B36F]"
                            onClick={() =>
                              setPendingDelete(
                                recentExpenses.find(
                                  (expense) =>
                                    expense.id === row.deletableExpenseId,
                                ) ?? null,
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.055] p-4 text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {t("branchLedger.reportTitle")}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-[#C9B7A0]">
              {t("branchLedger.reportBody")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
            disabled
          >
            <FileText className="h-4 w-4" />
            {t("branchLedger.balanceSheetPdf")}
          </Button>
        </div>
      </section>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>{t("branchLedger.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? t("branchLedger.deleteBody", {
                    description: pendingDelete.description,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingDelete(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExpenseDelete}
            >
              {t("branchLedger.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
