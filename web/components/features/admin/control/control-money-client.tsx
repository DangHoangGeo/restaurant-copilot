'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FinanceDashboard } from '@/components/features/admin/finance/FinanceDashboard';
import { cn } from '@/lib/utils';
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
} from '@/lib/server/finance/types';

interface ControlMoneyBranchSummary {
  restaurantId: string;
  name: string;
  subdomain: string;
  hasClosedSnapshot: boolean;
  revenueTotal: number;
  discountTotal: number;
  approvedLaborHours: number;
  combinedCostTotal: number;
  grossProfitEstimate: number;
  isActive: boolean;
}

interface ControlMoneyClientProps {
  locale: string;
  currency: string;
  year: number;
  month: number;
  branchCount: number;
  branchesWithSnapshot: number;
  revenueTotal: number;
  discountTotal: number;
  approvedLaborHours: number;
  combinedCostTotal: number;
  grossProfitEstimate: number;
  branches: ControlMoneyBranchSummary[];
  report: MonthlyFinanceReport | null;
  history: MonthlyFinanceSnapshot[];
  canClose: boolean;
}

function fmt(amount: number, currency: string, locale: string) {
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

export function ControlMoneyClient({
  locale,
  currency,
  year,
  month,
  branchCount,
  branchesWithSnapshot,
  revenueTotal,
  discountTotal,
  approvedLaborHours,
  combinedCostTotal,
  grossProfitEstimate,
  branches,
  report,
  history,
  canClose,
}: ControlMoneyClientProps) {
  const appLocale = useLocale();
  const router = useRouter();
  const [detailBranch, setDetailBranch] = useState<ControlMoneyBranchSummary | null>(
    branches.find((b) => b.isActive) ?? branches[0] ?? null
  );
  const [switching, setSwitching] = useState<string | null>(null);

  const branchesMissingSnapshot = branchCount - branchesWithSnapshot;
  const monthLabel = `${year}/${String(month).padStart(2, '0')}`;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const switchBranch = async (restaurantId: string) => {
    setSwitching(restaurantId);
    try {
      const res = await fetch('/api/v1/owner/organization/active-branch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      if (res.ok) {
        const b = branches.find((x) => x.restaurantId === restaurantId);
        if (b) setDetailBranch(b);
        router.refresh();
      }
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with month nav */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Combined business finance across all branches.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-md"
            onClick={() =>
              router.push(`/${appLocale}/control/finance?year=${prevYear}&month=${prevMonth}`)
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-medium tabular-nums">{monthLabel}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-md"
            disabled={isCurrentMonth}
            onClick={() =>
              router.push(`/${appLocale}/control/finance?year=${nextYear}&month=${nextMonth}`)
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Close attention */}
      {branchesMissingSnapshot > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {branchesMissingSnapshot} branch{branchesMissingSnapshot > 1 ? 'es' : ''} still need
            to close {monthLabel} before the numbers are complete.
          </span>
        </div>
      )}

      {/* Org stats row */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-card p-4 sm:grid-cols-5">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-xl font-semibold tabular-nums text-emerald-600">
            {fmt(revenueTotal, currency, locale)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Discounts: {fmt(discountTotal, currency, locale)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Gross profit</p>
          <p className="text-xl font-semibold tabular-nums">
            {fmt(grossProfitEstimate, currency, locale)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Total costs</p>
          <p className="text-xl font-semibold tabular-nums">
            {fmt(combinedCostTotal, currency, locale)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Approved labor</p>
          <p className="text-xl font-semibold tabular-nums">{approvedLaborHours.toFixed(1)}h</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Branches closed</p>
          <p
            className={cn(
              'text-xl font-semibold tabular-nums',
              branchesWithSnapshot < branchCount ? 'text-amber-600' : 'text-emerald-600'
            )}
          >
            {branchesWithSnapshot}/{branchCount}
          </p>
        </div>
      </div>

      {/* Branch rollup table */}
      <div>
        <h2 className="mb-3 text-sm font-medium">Branch breakdown</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Branch</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Revenue</TableHead>
                <TableHead className="text-right hidden md:table-cell">Discounts</TableHead>
                <TableHead className="text-right hidden md:table-cell">Costs</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Gross profit</TableHead>
                <TableHead className="text-center">Close</TableHead>
                <TableHead className="text-right pr-3">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const isSelected = detailBranch?.restaurantId === branch.restaurantId;
                const isSwitching = switching === branch.restaurantId;

                return (
                  <TableRow
                    key={branch.restaurantId}
                    className={cn(isSelected && 'bg-muted/30')}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate max-w-28">{branch.name}</p>
                          {isSelected && (
                            <p className="text-[10px] text-primary">viewing</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell tabular-nums text-sm">
                      {branch.hasClosedSnapshot
                        ? fmt(branch.revenueTotal, currency, locale)
                        : <span className="text-muted-foreground/60 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell tabular-nums text-sm text-muted-foreground">
                      {branch.hasClosedSnapshot
                        ? fmt(branch.discountTotal, currency, locale)
                        : <span className="text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell tabular-nums text-sm text-muted-foreground">
                      {branch.hasClosedSnapshot
                        ? fmt(branch.combinedCostTotal, currency, locale)
                        : <span className="text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell tabular-nums text-sm">
                      {branch.hasClosedSnapshot ? (
                        <span className="text-emerald-600">
                          {fmt(branch.grossProfitEstimate, currency, locale)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {branch.hasClosedSnapshot ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20">
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <Button
                        variant={isSelected ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 gap-1.5 rounded-lg text-xs"
                        disabled={!!switching}
                        onClick={() => switchBranch(branch.restaurantId)}
                      >
                        {isSwitching ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {isSelected ? 'Viewing' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Branch detail */}
      {detailBranch && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">
              {detailBranch.name} — {monthLabel}
            </h2>
            {!detailBranch.hasClosedSnapshot && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20">
                Month open
              </Badge>
            )}
          </div>
          <div className="rounded-lg border bg-card">
            <div className="p-4">
              <FinanceDashboard
                year={year}
                month={month}
                report={report}
                history={history}
                currency={currency}
                locale={locale}
                restaurantName={detailBranch.name}
                canClose={canClose}
                financeHref="/control/finance"
                hidePageChrome
                embedded
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
