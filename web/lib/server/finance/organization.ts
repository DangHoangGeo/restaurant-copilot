import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getMonthlyReport } from '@/lib/server/finance/service';
import type {
  FinancePeriodBranchSummary,
  FinancePeriodMonthSummary,
  FinancePeriodReport,
  FinancePeriodType,
  OrganizationFinanceExpense,
} from '@/lib/server/finance/types';
import type { CreateExpenseInput } from '@/lib/server/purchasing/schemas';

interface BranchFinanceMeta {
  id: string;
  name: string;
  tax: number | null;
  currency: string | null;
}

function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1;
}

function monthSequence(year: number, month: number, periodType: FinancePeriodType): Array<{ year: number; month: number }> {
  if (periodType === 'month') {
    return [{ year, month }];
  }

  const startMonth = quarterStartMonth(month);
  return [0, 1, 2].map((offset) => ({ year, month: startMonth + offset }));
}

function monthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );
}

function periodLabel(year: number, month: number, periodType: FinancePeriodType): string {
  if (periodType === 'month') {
    return `${year} / ${String(month).padStart(2, '0')}`;
  }

  const quarter = Math.floor((month - 1) / 3) + 1;
  return `Q${quarter} ${year}`;
}

function monthBoundaries(year: number, month: number): { fromDate: string; toDate: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

function resolveTaxRate(rate: number | null | undefined): number {
  if (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0) {
    return rate;
  }
  return 0.1;
}

function estimateIncludedTax(grossInclusive: number, rate: number): number {
  if (grossInclusive <= 0 || rate <= 0) return 0;
  return Number((grossInclusive * rate / (1 + rate)).toFixed(2));
}

async function loadCreatorMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .in('id', userIds);

  const creatorMap = new Map<string, string>();
  for (const row of data ?? []) {
    const label = (row.name as string | null) ?? (row.email as string | null);
    if (label) {
      creatorMap.set(row.id as string, label);
    }
  }
  return creatorMap;
}

export async function listOrganizationFinanceExpenses(params: {
  organizationId: string;
  year: number;
  month: number;
  periodType: FinancePeriodType;
}): Promise<OrganizationFinanceExpense[]> {
  const { organizationId, year, month, periodType } = params;
  const months = monthSequence(year, month, periodType);
  const { fromDate } = monthBoundaries(months[0].year, months[0].month);
  const { toDate } = monthBoundaries(months[months.length - 1].year, months[months.length - 1].month);

  const { data, error } = await supabaseAdmin
    .from('organization_finance_expenses')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`listOrganizationFinanceExpenses: ${error.message}`);
  }

  const rows = (data ?? []) as OrganizationFinanceExpense[];
  const creatorMap = await loadCreatorMap(
    Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean) as string[]))
  );

  return rows.map((row) => ({
    ...row,
    created_by_name: row.created_by ? creatorMap.get(row.created_by) ?? null : null,
  }));
}

export async function addOrganizationFinanceExpense(params: {
  organizationId: string;
  userId: string | null;
  currency: string;
  input: CreateExpenseInput & { vendor_name?: string | null };
}): Promise<OrganizationFinanceExpense> {
  const { organizationId, userId, currency, input } = params;
  const { data, error } = await supabaseAdmin
    .from('organization_finance_expenses')
    .insert({
      organization_id: organizationId,
      category: input.category,
      description: input.description,
      vendor_name: input.vendor_name ?? null,
      amount: input.amount,
      currency: input.currency ?? currency,
      expense_date: input.expense_date,
      receipt_url: input.receipt_url ?? null,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`addOrganizationFinanceExpense: ${error.message}`);
  }

  const row = data as OrganizationFinanceExpense;
  const creatorMap = await loadCreatorMap(row.created_by ? [row.created_by] : []);
  return {
    ...row,
    created_by_name: row.created_by ? creatorMap.get(row.created_by) ?? null : null,
  };
}

export async function getOrganizationFinancePeriodReport(params: {
  organizationId: string;
  branchIds: string[];
  selectedRestaurantId?: string | null;
  year: number;
  month: number;
  periodType: FinancePeriodType;
  currency: string;
  locale?: string;
}): Promise<FinancePeriodReport> {
  const {
    organizationId,
    branchIds,
    selectedRestaurantId = null,
    year,
    month,
    periodType,
    currency,
    locale = 'en-US',
  } = params;

  const scopedBranchIds =
    selectedRestaurantId && branchIds.includes(selectedRestaurantId)
      ? [selectedRestaurantId]
      : branchIds;

  const { data: branchRows, error: branchError } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, tax, currency')
    .in('id', scopedBranchIds);

  if (branchError) {
    throw new Error(`getOrganizationFinancePeriodReport branches: ${branchError.message}`);
  }

  const branches = (branchRows ?? []) as BranchFinanceMeta[];
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const months = monthSequence(year, month, periodType);
  const companyExpenses = await listOrganizationFinanceExpenses({
    organizationId,
    year,
    month,
    periodType,
  });

  const monthRows: FinancePeriodMonthSummary[] = [];
  const branchAccumulator = new Map<string, FinancePeriodBranchSummary>();
  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalNetSales = 0;
  let totalEstimatedSalesTax = 0;
  let totalNetSalesExTax = 0;
  let totalPurchasing = 0;
  let totalBranchExpense = 0;
  let totalLaborHours = 0;
  let totalLaborEntries = 0;
  let totalOrders = 0;
  let totalBranchesWithSnapshot = 0;

  for (const currentMonth of months) {
    const reports = await Promise.all(
      branches.map(async (branch) => {
        const report = await getMonthlyReport(
          branch.id,
          currentMonth.year,
          currentMonth.month,
          branch.currency ?? currency
        );

        return { branch, report };
      })
    );

    let monthRevenue = 0;
    let monthDiscount = 0;
    let monthNetSales = 0;
    let monthEstimatedSalesTax = 0;
    let monthNetSalesExTax = 0;
    let monthPurchasing = 0;
    let monthBranchExpense = 0;
    let monthLaborHours = 0;
    let monthOrderCount = 0;
    let monthBranchesWithSnapshot = 0;

    for (const { branch, report } of reports) {
      const data = report.data;
      const branchTaxRate = resolveTaxRate(branch.tax);
      const netSales = data.revenue_total - data.discount_total;
      const estimatedSalesTax = estimateIncludedTax(netSales, branchTaxRate);
      const netSalesExTax = Number((netSales - estimatedSalesTax).toFixed(2));

      monthRevenue += data.revenue_total;
      monthDiscount += data.discount_total;
      monthNetSales += netSales;
      monthEstimatedSalesTax += estimatedSalesTax;
      monthNetSalesExTax += netSalesExTax;
      monthPurchasing += data.purchasing_total;
      monthBranchExpense += data.expense_total;
      monthLaborHours += data.approved_labor_hours;
      monthOrderCount += data.order_count;
      if (report.kind === 'snapshot') {
        monthBranchesWithSnapshot += 1;
      }

      const existingBranch = branchAccumulator.get(branch.id) ?? {
        restaurant_id: branch.id,
        name: branch.name,
        tax_rate: branchTaxRate,
        revenue_total: 0,
        discount_total: 0,
        net_sales_total: 0,
        estimated_sales_tax_total: 0,
        net_sales_ex_tax: 0,
        purchasing_total: 0,
        branch_expense_total: 0,
        combined_cost_total: 0,
        gross_profit_estimate: 0,
        approved_labor_hours: 0,
        branches_with_snapshot: 0,
      };

      existingBranch.revenue_total += data.revenue_total;
      existingBranch.discount_total += data.discount_total;
      existingBranch.net_sales_total += netSales;
      existingBranch.estimated_sales_tax_total += estimatedSalesTax;
      existingBranch.net_sales_ex_tax += netSalesExTax;
      existingBranch.purchasing_total += data.purchasing_total;
      existingBranch.branch_expense_total += data.expense_total;
      existingBranch.combined_cost_total += data.combined_cost_total;
      existingBranch.gross_profit_estimate += data.gross_profit_estimate;
      existingBranch.approved_labor_hours += data.approved_labor_hours;
      if (report.kind === 'snapshot') {
        existingBranch.branches_with_snapshot += 1;
      }

      branchAccumulator.set(branch.id, existingBranch);
      totalLaborEntries += data.labor_entry_count;
    }

    const monthCompanyExpense = companyExpenses
      .filter((expense) => {
        const [expenseYear, expenseMonth] = expense.expense_date.split('-').map(Number);
        return expenseYear === currentMonth.year && expenseMonth === currentMonth.month;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    monthRows.push({
      year: currentMonth.year,
      month: currentMonth.month,
      label: monthLabel(currentMonth.year, currentMonth.month, locale),
      revenue_total: monthRevenue,
      discount_total: monthDiscount,
      net_sales_total: monthNetSales,
      estimated_sales_tax_total: monthEstimatedSalesTax,
      net_sales_ex_tax: monthNetSalesExTax,
      purchasing_total: monthPurchasing,
      branch_expense_total: monthBranchExpense,
      company_expense_total: monthCompanyExpense,
      combined_cost_total: monthPurchasing + monthBranchExpense + monthCompanyExpense,
      gross_profit_estimate: monthNetSalesExTax - (monthPurchasing + monthBranchExpense + monthCompanyExpense),
      approved_labor_hours: Number(monthLaborHours.toFixed(2)),
      order_count: monthOrderCount,
      branches_with_snapshot: monthBranchesWithSnapshot,
    });

    totalRevenue += monthRevenue;
    totalDiscount += monthDiscount;
    totalNetSales += monthNetSales;
    totalEstimatedSalesTax += monthEstimatedSalesTax;
    totalNetSalesExTax += monthNetSalesExTax;
    totalPurchasing += monthPurchasing;
    totalBranchExpense += monthBranchExpense;
    totalLaborHours += monthLaborHours;
    totalOrders += monthOrderCount;
    totalBranchesWithSnapshot += monthBranchesWithSnapshot;
  }

  const companyExpenseTotal = companyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const combinedCostTotal =
    totalPurchasing + totalBranchExpense + (selectedRestaurantId ? 0 : companyExpenseTotal);

  const selectedBranch = selectedRestaurantId ? branchMap.get(selectedRestaurantId) ?? null : null;

  return {
    periodType,
    year,
    month,
    quarter: Math.floor((month - 1) / 3) + 1,
    periodLabel: periodLabel(year, month, periodType),
    currency,
    selectedRestaurantId,
    selectedRestaurantName: selectedBranch?.name ?? null,
    revenue_total: totalRevenue,
    discount_total: totalDiscount,
    net_sales_total: totalNetSales,
    estimated_sales_tax_total: totalEstimatedSalesTax,
    net_sales_ex_tax: totalNetSalesExTax,
    purchasing_total: totalPurchasing,
    branch_expense_total: totalBranchExpense,
    company_expense_total: companyExpenseTotal,
    combined_cost_total: combinedCostTotal,
    gross_profit_estimate: totalNetSalesExTax - combinedCostTotal,
    approved_labor_hours: Number(totalLaborHours.toFixed(2)),
    labor_entry_count: totalLaborEntries,
    order_count: totalOrders,
    branch_count: branches.length,
    branches_with_snapshot: totalBranchesWithSnapshot,
    monthRows,
    branchRows: Array.from(branchAccumulator.values()).sort((left, right) => right.net_sales_total - left.net_sales_total),
    companyExpenses,
  };
}

export function buildOrganizationFinanceExportCsv(report: FinancePeriodReport): string {
  const rows: string[][] = [
    ['Organization Finance Report'],
    ['Scope', report.selectedRestaurantName ?? 'All branches'],
    ['Period', report.periodLabel],
    ['Period Type', report.periodType],
    ['Currency', report.currency],
    [],
    ['Metric', 'Amount'],
    ['Gross sales', report.revenue_total.toFixed(2)],
    ['Discounts', report.discount_total.toFixed(2)],
    ['Net sales (tax inclusive)', report.net_sales_total.toFixed(2)],
    ['Estimated sales tax', report.estimated_sales_tax_total.toFixed(2)],
    ['Net sales (ex tax)', report.net_sales_ex_tax.toFixed(2)],
    ['Purchase orders', report.purchasing_total.toFixed(2)],
    ['Branch expenses', report.branch_expense_total.toFixed(2)],
    ['Company shared expenses', report.company_expense_total.toFixed(2)],
    ['Total costs used in summary', report.combined_cost_total.toFixed(2)],
    ['Gross profit estimate', report.gross_profit_estimate.toFixed(2)],
    ['Approved labor hours', report.approved_labor_hours.toFixed(2)],
    [],
    ['Month breakdown'],
    ['Label', 'Net sales ex tax', 'Sales tax', 'Purchase orders', 'Branch expenses', 'Company expenses', 'Gross profit'],
    ...report.monthRows.map((row) => [
      row.label,
      row.net_sales_ex_tax.toFixed(2),
      row.estimated_sales_tax_total.toFixed(2),
      row.purchasing_total.toFixed(2),
      row.branch_expense_total.toFixed(2),
      row.company_expense_total.toFixed(2),
      row.gross_profit_estimate.toFixed(2),
    ]),
    [],
    ['Branch breakdown'],
    ['Branch', 'Net sales ex tax', 'Sales tax', 'Purchase orders', 'Branch expenses', 'Gross profit'],
    ...report.branchRows.map((row) => [
      row.name,
      row.net_sales_ex_tax.toFixed(2),
      row.estimated_sales_tax_total.toFixed(2),
      row.purchasing_total.toFixed(2),
      row.branch_expense_total.toFixed(2),
      row.gross_profit_estimate.toFixed(2),
    ]),
  ];

  if (report.companyExpenses.length > 0) {
    rows.push([]);
    rows.push(['Company shared expenses']);
    rows.push(['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Recorded by']);
    report.companyExpenses.forEach((expense) => {
      rows.push([
        expense.expense_date,
        expense.category,
        expense.description,
        expense.vendor_name ?? '',
        expense.amount.toFixed(2),
        expense.created_by_name ?? '',
      ]);
    });
  }

  return rows
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? '');
          if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
            return `"${normalized.replace(/"/g, '""')}"`;
          }
          return normalized;
        })
        .join(',')
    )
    .join('\n');
}
