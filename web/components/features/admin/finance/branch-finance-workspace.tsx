'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OwnerBranchExpenseDialog } from '@/components/features/admin/control/owner-branch-expense-dialog';
import { FinanceDashboard } from '@/components/features/admin/finance/FinanceDashboard';
import type { MonthlyFinanceReport, MonthlyFinanceSnapshot } from '@/lib/server/finance/types';
import type {
  BranchFinanceDetailData,
  BranchFinanceRecentExpense,
} from '@/lib/server/control/branch-finance-detail';

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

function formatCurrency(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SpendBreakdown({
  title,
  rows,
  currency,
  locale,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ category: string; amount: number }>;
  currency: string;
  locale: string;
  emptyLabel: string;
}) {
  const max = rows.reduce((largest, row) => Math.max(largest, row.amount), 0);
  const visibleRows = rows.filter((row) => row.amount > 0);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <div className="mt-4 space-y-3">
        {visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          visibleRows.map((row) => (
            <div key={row.category} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-slate-700">{row.category}</p>
                <p className="text-xs font-medium tabular-nums text-slate-900">
                  {formatCurrency(row.amount, currency, locale)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${max > 0 ? Math.max((row.amount / max) * 100, 6) : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function BranchFinanceWorkspace({
  branchId,
  branchName,
  locale,
  controlPath,
  currency,
  year,
  month,
  report,
  history,
  detail,
  canExport,
  canClose,
  canViewIncome,
  canViewSpending,
  canManageExpenses,
}: BranchFinanceWorkspaceProps) {
  const t = useTranslations('owner.finance');
  const tPurchasing = useTranslations('owner.purchasing');
  const router = useRouter();
  const [recentExpenses, setRecentExpenses] = useState(detail?.recentExpenses ?? []);

  const data = report?.data ?? null;
  const defaultTab = !canViewIncome && canViewSpending ? 'spending' : 'summary';
  const tabCount = 1 + Number(canViewIncome) + Number(canViewSpending);

  const handleExpenseCreated = (expense: BranchFinanceRecentExpense) => {
    setRecentExpenses((current) => [expense, ...current].slice(0, 20));
    router.refresh();
  };

  const handleExpenseDelete = async (expenseId: string) => {
    const res = await fetch(
      `/api/v1/owner/organization/restaurants/${branchId}/purchasing/expenses/${expenseId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      setRecentExpenses((current) => current.filter((expense) => expense.id !== expenseId));
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <FinanceDashboard
        year={year}
        month={month}
        report={report}
        history={history}
        currency={currency}
        locale={locale}
        restaurantName={branchName}
        canExport={canExport}
        canClose={canClose}
        canViewIncome={canViewIncome}
        canViewSpending={canViewSpending}
        hidePageChrome
        embedded
        navigationPath={controlPath}
        navigationParams={{ tab: 'finance' }}
        apiBasePath={`/api/v1/owner/organization/restaurants/${branchId}/finance/monthly`}
      />

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList
          className={`grid w-full ${
            tabCount === 3 ? 'grid-cols-3' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <TabsTrigger value="summary">{t('ledger.tabs.summary')}</TabsTrigger>
          {canViewIncome ? <TabsTrigger value="income">{t('ledger.tabs.income')}</TabsTrigger> : null}
          {canViewSpending ? <TabsTrigger value="spending">{t('ledger.tabs.spending')}</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <SpendBreakdown
              title={t('ledger.summary.expenseByCategory')}
              rows={detail?.expenseCategorySpend ?? []}
              currency={currency}
              locale={locale}
              emptyLabel={t('ledger.summary.noExpenseCategories')}
            />
            <SpendBreakdown
              title={t('ledger.summary.purchaseByCategory')}
              rows={detail?.purchaseCategorySpend ?? []}
              currency={currency}
              locale={locale}
              emptyLabel={t('ledger.summary.noPurchaseCategories')}
            />
          </div>
        </TabsContent>

        {canViewIncome ? (
          <TabsContent value="income" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={t('ledger.income.grossSales')}
                value={formatCurrency(data?.revenue_total ?? 0, currency, locale)}
              />
              <MetricCard
                label={t('ledger.income.discounts')}
                value={formatCurrency(data?.discount_total ?? 0, currency, locale)}
              />
              <MetricCard
                label={t('ledger.income.netSales')}
                value={formatCurrency(
                  (data?.revenue_total ?? 0) - (data?.discount_total ?? 0),
                  currency,
                  locale
                )}
              />
              <MetricCard
                label={t('ledger.income.completedOrders')}
                value={String(data?.order_count ?? 0)}
              />
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3">{t('ledger.income.recentSales')}</TableHead>
                    <TableHead className="px-4 py-3">{t('ledger.income.table')}</TableHead>
                    <TableHead className="px-4 py-3">{t('ledger.income.items')}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{t('ledger.income.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.recentSales ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('ledger.income.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (detail?.recentSales ?? []).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">#{sale.id.slice(0, 8)}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(sale.created_at, locale)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {sale.table_name ?? t('ledger.income.walkIn')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {sale.item_count}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(sale.total_amount, currency, locale)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ) : null}

        {canViewSpending ? (
          <TabsContent value="spending" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label={t('ledger.spending.purchaseOrders')}
                value={formatCurrency(data?.purchasing_total ?? 0, currency, locale)}
              />
              <MetricCard
                label={t('ledger.spending.quickExpenses')}
                value={formatCurrency(data?.expense_total ?? 0, currency, locale)}
              />
              <MetricCard
                label={t('ledger.spending.totalSpending')}
                value={formatCurrency(data?.combined_cost_total ?? 0, currency, locale)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t('spending.addExpenseTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {canManageExpenses
                        ? t('spending.addExpenseHint')
                        : t('spending.manageLocked')}
                    </p>
                  </div>
                  {canManageExpenses ? (
                    <OwnerBranchExpenseDialog
                      branchId={branchId}
                      branchName={branchName}
                      currency={currency}
                      onCreated={handleExpenseCreated}
                    />
                  ) : null}
                </div>
              </div>

              <SpendBreakdown
                title={t('ledger.spending.categoryBreakdown')}
                rows={detail?.expenseCategorySpend ?? []}
                currency={currency}
                locale={locale}
                emptyLabel={t('ledger.spending.noSpendCategories')}
              />
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3">{t('spending.expenseLedger')}</TableHead>
                    <TableHead className="px-4 py-3">{tPurchasing('fields.category')}</TableHead>
                    <TableHead className="px-4 py-3">{t('spending.recordedBy')}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{tPurchasing('fields.amount')}</TableHead>
                    {canManageExpenses ? <TableHead className="px-4 py-3 text-right">{t('spending.actions')}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageExpenses ? 5 : 4} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('spending.emptyExpenses')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{expense.description}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(expense.expense_date, locale)}
                              {expense.notes ? ` · ${expense.notes}` : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm capitalize text-slate-600">
                          {tPurchasing(`expenseCategories.${expense.category}`)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {expense.created_by_name ?? t('spending.unknownCreator')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(expense.amount, expense.currency || currency, locale)}
                        </TableCell>
                        {canManageExpenses ? (
                          <TableCell className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-slate-500 hover:text-destructive"
                              onClick={() => handleExpenseDelete(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3">{t('spending.purchaseLedger')}</TableHead>
                    <TableHead className="px-4 py-3">{tPurchasing('fields.category')}</TableHead>
                    <TableHead className="px-4 py-3">{t('spending.recordedBy')}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{tPurchasing('fields.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.recentPurchases ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('spending.emptyPurchases')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (detail?.recentPurchases ?? []).map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {purchase.supplier_name ?? tPurchasing('unknownSupplier')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(purchase.order_date, locale)} · {purchase.status}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {tPurchasing(`categories.${purchase.category}`)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          {purchase.created_by_name ?? t('spending.unknownCreator')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(purchase.total_amount, purchase.currency || currency, locale)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
