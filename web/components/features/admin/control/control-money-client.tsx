'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OrganizationExpenseDialog } from '@/components/features/admin/finance/organization-expense-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { FinancePeriodReport, FinancePeriodType } from '@/lib/server/finance/types';

interface ControlMoneyClientProps {
  locale: string;
  currency: string;
  year: number;
  month: number;
  periodType: FinancePeriodType;
  branches: Array<{
    id: string;
    name: string;
    subdomain: string;
  }>;
  report: FinancePeriodReport;
  canExport: boolean;
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

function formatCompact(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency, locale);
  }
}

function formatPercent(rate: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month - 1 + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

function closeProgress(branchesWithSnapshot: number, periodType: FinancePeriodType): string {
  return periodType === 'quarter' ? `${branchesWithSnapshot}/3` : branchesWithSnapshot > 0 ? '1/1' : '0/1';
}

function periodChartData(
  report: FinancePeriodReport,
  canViewIncome: boolean,
  canViewSpending: boolean
): Array<Record<string, number | string>> {
  if (report.monthRows.length > 1) {
    return report.monthRows.map((row) => ({
      label: row.label,
      sales: row.net_sales_ex_tax,
      spending: row.combined_cost_total,
      profit: row.gross_profit_estimate,
    }));
  }

  return report.branchRows.slice(0, 6).map((row) => ({
    label: row.name,
    sales: canViewIncome ? row.net_sales_ex_tax : 0,
    spending: canViewSpending ? row.combined_cost_total : 0,
    profit: canViewIncome && canViewSpending ? row.gross_profit_estimate : 0,
  }));
}

function taxChartData(report: FinancePeriodReport): Array<Record<string, number | string>> {
  if (report.monthRows.length > 1) {
    return report.monthRows.map((row) => ({
      label: row.label,
      tax: row.estimated_sales_tax_total,
      exTax: row.net_sales_ex_tax,
    }));
  }

  return report.branchRows.map((row) => ({
    label: row.name,
    tax: row.estimated_sales_tax_total,
    exTax: row.net_sales_ex_tax,
  }));
}

function companyExpenseCategoryRows(
  report: FinancePeriodReport
): Array<{ category: string; amount: number }> {
  const totals = new Map<string, number>();

  report.companyExpenses.forEach((expense) => {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  });

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);
}

function StatCell({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'green' | 'amber' | 'blue' | 'red';
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold tabular-nums text-slate-900',
          tone === 'green' && 'text-emerald-600',
          tone === 'amber' && 'text-amber-600',
          tone === 'blue' && 'text-sky-600',
          tone === 'red' && 'text-rose-600'
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function FinanceTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; dataKey?: string | number; value?: number; name?: string }>;
  label?: string;
  currency: string;
  locale: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-slate-900">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? '#0f172a' }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-slate-900">
              {formatCurrency(entry.value ?? 0, currency, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ControlMoneyClient({
  locale,
  currency,
  year,
  month,
  periodType,
  branches,
  report,
  canExport,
  canViewIncome,
  canViewSpending,
  canManageExpenses,
}: ControlMoneyClientProps) {
  const t = useTranslations('owner.finance');
  const tPurchasing = useTranslations('owner.purchasing');
  const router = useRouter();
  const pathname = usePathname();

  const selectedScope = report.selectedRestaurantId ?? 'all';
  const chartData = periodChartData(report, canViewIncome, canViewSpending);
  const taxData = taxChartData(report);
  const expenseCategories = companyExpenseCategoryRows(report);
  const monthStep = periodType === 'quarter' ? 3 : 1;
  const tabValues = [
    'summary',
    'branches',
    ...(canViewIncome ? ['tax'] : []),
    ...(canViewSpending ? ['shared-expenses'] : []),
  ];

  const updateFilters = (next: {
    year?: number;
    month?: number;
    periodType?: FinancePeriodType;
    restaurantId?: string | null;
  }) => {
    const params = new URLSearchParams();
    params.set('year', String(next.year ?? year));
    params.set('month', String(next.month ?? month));
    params.set('period', next.periodType ?? periodType);

    const restaurantId =
      next.restaurantId === undefined ? report.selectedRestaurantId : next.restaurantId;
    if (restaurantId) {
      params.set('restaurantId', restaurantId);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const navigatePeriod = (direction: -1 | 1) => {
    const shifted = shiftMonth(year, month, direction * monthStep);
    updateFilters({ year: shifted.year, month: shifted.month });
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      period: periodType,
    });

    if (report.selectedRestaurantId) {
      params.set('restaurantId', report.selectedRestaurantId);
    }

    const link = document.createElement('a');
    link.href = `/api/v1/owner/organization/finance/export?${params.toString()}`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-medium">{t('company.sectionLabel')}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{t('company.pageTitle')}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {t('company.pageDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-[520px] lg:justify-end">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
              <Button
                type="button"
                variant={periodType === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-lg"
                onClick={() => updateFilters({ periodType: 'month' })}
              >
                {t('company.controls.month')}
              </Button>
              <Button
                type="button"
                variant={periodType === 'quarter' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-lg"
                onClick={() => updateFilters({ periodType: 'quarter' })}
              >
                {t('company.controls.quarter')}
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => navigatePeriod(-1)}
                aria-label={t('company.controls.previousPeriod')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[110px] px-2 text-center text-sm font-medium text-slate-900">
                {report.periodLabel}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => navigatePeriod(1)}
                aria-label={t('company.controls.nextPeriod')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={selectedScope} onValueChange={(value) => updateFilters({ restaurantId: value === 'all' ? null : value })}>
              <SelectTrigger className="h-10 min-w-[180px] rounded-xl">
                <SelectValue placeholder={t('company.controls.branchFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('company.controls.allBranches')}</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canManageExpenses ? <OrganizationExpenseDialog currency={currency} /> : null}

            {canExport ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        {canViewIncome ? (
          <>
            <StatCell
              label={t('company.stats.netSalesExTax')}
              value={formatCurrency(report.net_sales_ex_tax, currency, locale)}
              hint={t('company.stats.netSalesExTaxHint')}
              tone="green"
            />
            <StatCell
              label={t('company.stats.salesTax')}
              value={formatCurrency(report.estimated_sales_tax_total, currency, locale)}
              hint={t('company.stats.salesTaxHint')}
              tone="amber"
            />
          </>
        ) : null}
        {canViewSpending ? (
          <StatCell
            label={t(
              report.selectedRestaurantId
                ? 'company.stats.branchSpend'
                : 'company.stats.totalSpend'
            )}
            value={formatCurrency(report.combined_cost_total, currency, locale)}
            hint={t(
              report.selectedRestaurantId
                ? 'company.stats.branchSpendHint'
                : 'company.stats.totalSpendHint'
            )}
          />
        ) : null}
        {canViewIncome && canViewSpending ? (
          <StatCell
            label={t(
              report.selectedRestaurantId
                ? 'company.stats.branchProfit'
                : 'company.stats.grossProfit'
            )}
            value={formatCurrency(report.gross_profit_estimate, currency, locale)}
            hint={t(
              report.selectedRestaurantId
                ? 'company.stats.branchProfitHint'
                : 'company.stats.grossProfitHint'
            )}
            tone={report.gross_profit_estimate >= 0 ? 'blue' : 'red'}
          />
        ) : (
          <StatCell
            label={t('company.stats.branchesInScope')}
            value={`${report.branch_count}`}
            hint={t('company.stats.branchesInScopeHint')}
          />
        )}
      </section>

      {report.selectedRestaurantId && report.company_expense_total > 0 ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t('company.selectedBranchCompanyExpenseNotice', {
            amount: formatCurrency(report.company_expense_total, currency, locale),
          })}
        </div>
      ) : null}

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className={`grid w-full ${tabValues.length === 4 ? 'grid-cols-4' : tabValues.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="summary">{t('company.tabs.summary')}</TabsTrigger>
          <TabsTrigger value="branches">{t('company.tabs.branches')}</TabsTrigger>
          {canViewIncome ? <TabsTrigger value="tax">{t('company.tabs.tax')}</TabsTrigger> : null}
          {canViewSpending ? (
            <TabsTrigger value="shared-expenses">{t('company.tabs.sharedExpenses')}</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Section
              title={
                report.monthRows.length > 1
                  ? t('company.summary.trendTitle')
                  : t('company.summary.branchCompareTitle')
              }
              description={
                report.monthRows.length > 1
                  ? t('company.summary.trendDescription')
                  : t('company.summary.branchCompareDescription')
              }
            >
              {chartData.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
                  {t('company.summary.chartEmpty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value: number) => formatCompact(value, currency, locale)}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={<FinanceTooltip currency={currency} locale={locale} />}
                    />
                    {canViewIncome ? (
                      <Bar
                        dataKey="sales"
                        name={t('company.summary.salesSeries')}
                        fill="#0f766e"
                        radius={[6, 6, 0, 0]}
                      />
                    ) : null}
                    {canViewSpending ? (
                      <Bar
                        dataKey="spending"
                        name={t('company.summary.spendingSeries')}
                        fill="#64748b"
                        radius={[6, 6, 0, 0]}
                      />
                    ) : null}
                    {canViewIncome && canViewSpending ? (
                      <Bar
                        dataKey="profit"
                        name={t('company.summary.profitSeries')}
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    ) : null}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            <Section
              title={t('company.summary.snapshotTitle')}
              description={t('company.summary.snapshotDescription')}
            >
              <Table>
                <TableBody>
                  {canViewIncome ? (
                    <>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('grossSales')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(report.revenue_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('discounts')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-amber-600">
                          -{formatCurrency(report.discount_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('company.summary.netSalesInclusive')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(report.net_sales_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('company.summary.salesTax')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-amber-600">
                          {formatCurrency(report.estimated_sales_tax_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 font-medium text-slate-900">{t('company.summary.netSalesExTax')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-semibold text-emerald-600">
                          {formatCurrency(report.net_sales_ex_tax, currency, locale)}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : null}

                  {canViewSpending ? (
                    <>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('purchaseOrders')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(report.purchasing_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('company.summary.branchExpenses')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(report.branch_expense_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 text-slate-500">{t('company.summary.companyExpenses')}</TableCell>
                        <TableCell className="px-0 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(report.company_expense_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 py-3 font-medium text-slate-900">
                          {t(
                            report.selectedRestaurantId
                              ? 'company.summary.branchOperatingSpend'
                              : 'company.summary.totalSpend'
                          )}
                        </TableCell>
                        <TableCell className="px-0 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(report.combined_cost_total, currency, locale)}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : null}

                  {canViewIncome && canViewSpending ? (
                    <TableRow>
                      <TableCell className="px-0 py-3 font-medium text-slate-900">
                        {t(
                          report.selectedRestaurantId
                            ? 'company.summary.branchOperatingProfit'
                            : 'company.summary.grossProfit'
                        )}
                      </TableCell>
                      <TableCell className="px-0 py-3 text-right font-semibold text-sky-600">
                        {formatCurrency(report.gross_profit_estimate, currency, locale)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Section>
          </div>

          <Section
            title={t('company.summary.periodTableTitle')}
            description={t('company.summary.periodTableDescription')}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('company.summary.periodColumn')}</TableHead>
                  {canViewIncome ? (
                    <>
                      <TableHead className="text-right">{t('company.summary.netSalesExTax')}</TableHead>
                      <TableHead className="text-right">{t('company.summary.salesTax')}</TableHead>
                    </>
                  ) : null}
                  {canViewSpending ? (
                    <>
                      <TableHead className="text-right">{t('company.summary.totalSpend')}</TableHead>
                      <TableHead className="text-right">{t('company.summary.companyExpenses')}</TableHead>
                    </>
                  ) : null}
                  {canViewIncome && canViewSpending ? (
                    <TableHead className="text-right">{t('grossProfit')}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.monthRows.map((row) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell className="font-medium text-slate-900">{row.label}</TableCell>
                    {canViewIncome ? (
                      <>
                        <TableCell className="text-right tabular-nums text-slate-900">
                          {formatCurrency(row.net_sales_ex_tax, currency, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">
                          {formatCurrency(row.estimated_sales_tax_total, currency, locale)}
                        </TableCell>
                      </>
                    ) : null}
                    {canViewSpending ? (
                      <>
                        <TableCell className="text-right tabular-nums text-slate-900">
                          {formatCurrency(row.combined_cost_total, currency, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">
                          {formatCurrency(row.company_expense_total, currency, locale)}
                        </TableCell>
                      </>
                    ) : null}
                    {canViewIncome && canViewSpending ? (
                      <TableCell className="text-right tabular-nums text-sky-600">
                        {formatCurrency(row.gross_profit_estimate, currency, locale)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Section
            title={t('company.branches.title')}
            description={t('company.branches.description')}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('company.branches.branch')}</TableHead>
                  {canViewIncome ? (
                    <>
                      <TableHead className="text-right">{t('company.summary.netSalesExTax')}</TableHead>
                      <TableHead className="text-right">{t('company.summary.salesTax')}</TableHead>
                    </>
                  ) : null}
                  {canViewSpending ? (
                    <>
                      <TableHead className="text-right">{t('purchaseOrders')}</TableHead>
                      <TableHead className="text-right">{t('company.summary.branchExpenses')}</TableHead>
                    </>
                  ) : null}
                  {canViewIncome && canViewSpending ? (
                    <TableHead className="text-right">{t('grossProfit')}</TableHead>
                  ) : null}
                  <TableHead className="text-right">{t('company.branches.close')}</TableHead>
                  <TableHead className="text-right">{t('company.branches.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.branchRows.map((branch) => (
                  <TableRow key={branch.restaurant_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{branch.name}</p>
                          <p className="text-xs text-slate-500">{formatPercent(branch.tax_rate, locale)}</p>
                        </div>
                      </div>
                    </TableCell>
                    {canViewIncome ? (
                      <>
                        <TableCell className="text-right tabular-nums text-slate-900">
                          {formatCurrency(branch.net_sales_ex_tax, currency, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">
                          {formatCurrency(branch.estimated_sales_tax_total, currency, locale)}
                        </TableCell>
                      </>
                    ) : null}
                    {canViewSpending ? (
                      <>
                        <TableCell className="text-right tabular-nums text-slate-900">
                          {formatCurrency(branch.purchasing_total, currency, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-900">
                          {formatCurrency(branch.branch_expense_total, currency, locale)}
                        </TableCell>
                      </>
                    ) : null}
                    {canViewIncome && canViewSpending ? (
                      <TableCell className="text-right tabular-nums text-sky-600">
                        {formatCurrency(branch.gross_profit_estimate, currency, locale)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <Badge variant="outline" className="rounded-full">
                        {closeProgress(branch.branches_with_snapshot, periodType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="rounded-xl">
                        <Link href={`/${locale}/control/restaurants/${branch.restaurant_id}?tab=finance&year=${year}&month=${month}`}>
                          {t('company.branches.open')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {canViewIncome ? (
        <TabsContent value="tax" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Section
              title={t('company.tax.title')}
              description={t('company.tax.description')}
            >
              {taxData.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
                  {t('company.tax.empty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={taxData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value: number) => formatCompact(value, currency, locale)}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip content={<FinanceTooltip currency={currency} locale={locale} />} />
                    <Bar
                      dataKey="tax"
                      name={t('company.tax.taxSeries')}
                      fill="#d97706"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="exTax"
                      name={t('company.tax.salesSeries')}
                      fill="#0f766e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            <Section
              title={t('company.tax.tableTitle')}
              description={t('company.tax.tableDescription')}
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t('company.tax.scope')}</TableHead>
                    <TableHead className="text-right">{t('company.tax.taxRate')}</TableHead>
                    <TableHead className="text-right">{t('company.summary.netSalesInclusive')}</TableHead>
                    <TableHead className="text-right">{t('company.summary.salesTax')}</TableHead>
                    <TableHead className="text-right">{t('company.summary.netSalesExTax')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.branchRows.map((branch) => (
                    <TableRow key={branch.restaurant_id}>
                      <TableCell className="font-medium text-slate-900">{branch.name}</TableCell>
                      <TableCell className="text-right text-slate-600">
                        {formatPercent(branch.tax_rate, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-900">
                        {formatCurrency(branch.net_sales_total, currency, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {formatCurrency(branch.estimated_sales_tax_total, currency, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">
                        {formatCurrency(branch.net_sales_ex_tax, currency, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </div>
        </TabsContent>
        ) : null}

        {canViewSpending ? (
        <TabsContent value="shared-expenses" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Section
              title={t('company.sharedExpenses.title')}
              description={t('company.sharedExpenses.description')}
              action={canManageExpenses ? <OrganizationExpenseDialog currency={currency} variant="outline" /> : null}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{t('company.sharedExpenses.total')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(report.company_expense_total, currency, locale)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('company.sharedExpenses.totalHint')}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{t('company.sharedExpenses.entryCount')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {report.companyExpenses.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('company.sharedExpenses.entryCountHint')}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {expenseCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    {t('company.sharedExpenses.empty')}
                  </div>
                ) : (
                  expenseCategories.map((row) => {
                    const max = expenseCategories[0]?.amount ?? 1;
                    const width = max > 0 ? Math.max((row.amount / max) * 100, 8) : 0;

                    return (
                      <div key={row.category} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-slate-700">
                            {tPurchasing(`expenseCategories.${row.category}`)}
                          </p>
                          <p className="text-xs font-medium tabular-nums text-slate-900">
                            {formatCurrency(row.amount, currency, locale)}
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            <Section
              title={t('company.sharedExpenses.ledgerTitle')}
              description={t('company.sharedExpenses.ledgerDescription')}
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t('company.sharedExpenses.date')}</TableHead>
                    <TableHead>{t('company.sharedExpenses.category')}</TableHead>
                    <TableHead>{t('company.sharedExpenses.descriptionColumn')}</TableHead>
                    <TableHead>{t('company.sharedExpenses.vendor')}</TableHead>
                    <TableHead>{t('company.sharedExpenses.recordedBy')}</TableHead>
                    <TableHead className="text-right">{t('company.sharedExpenses.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.companyExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                        {t('company.sharedExpenses.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.companyExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-slate-600">
                          {formatDate(expense.expense_date, locale)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {tPurchasing(`expenseCategories.${expense.category}`)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{expense.description}</p>
                            {expense.notes ? (
                              <p className="mt-1 text-xs text-slate-500">{expense.notes}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {expense.vendor_name ?? '-'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {expense.created_by_name ?? t('spending.unknownCreator')}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-slate-900">
                          {formatCurrency(expense.amount, expense.currency || currency, locale)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Section>
          </div>
        </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
