'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plus,
} from 'lucide-react';
import { AddBranchModal } from '@/components/features/admin/branches/AddBranchModal';
import { BranchScopedLinkButton } from '@/components/features/admin/control/branch-scoped-link-button';
import { OwnerBranchExpenseDialog } from '@/components/features/admin/control/owner-branch-expense-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FounderControlOverviewData } from '@/lib/server/control/overview';

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
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatContact(branch: Branch, emptyLabel: string): string {
  if (branch.phone && branch.email) {
    return `${branch.phone} · ${branch.email}`;
  }

  return branch.phone ?? branch.email ?? emptyLabel;
}

function StatItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
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
  const t = useTranslations('owner.branches');
  const tPurchasing = useTranslations('owner.purchasing');
  const router = useRouter();
  const [branches] = useState(initialBranches);
  const [showAddBranch, setShowAddBranch] = useState(false);

  const handleBranchAdded = () => {
    setShowAddBranch(false);
    router.refresh();
  };

  const monthLabel = `${overview.current_month.year}/${String(overview.current_month.month).padStart(2, '0')}`;
  const setupNeededCount = branches.filter((branch) => !branch.onboarded).length;
  const alerts = [
    setupNeededCount > 0
      ? t('workspace.alerts.setupNeeded', { count: setupNeededCount })
      : null,
    overview.attention.branches_missing_snapshot > 0
      ? t('workspace.alerts.monthCloseNeeded', {
          count: overview.attention.branches_missing_snapshot,
        })
      : null,
    overview.attention.branches_with_open_orders > 0
      ? t('workspace.alerts.openOrders', {
          count: overview.attention.branches_with_open_orders,
        })
      : null,
  ].filter(Boolean) as string[];

  const overviewBranchById = new Map(
    overview.branches.map((branch) => [branch.restaurant_id, branch])
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">{t('pageTitle')}</h1>
                <Badge variant="secondary" className="rounded-full">
                  {branches.length}
                </Badge>
              </div>
              {companyPublicSubdomain ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('workspace.ownerWorkspace', {
                    subdomain: `${companyPublicSubdomain}.coorder.ai`,
                  })}
                </p>
              ) : null}
            </div>
          </div>

          {canAddBranch ? (
            <Button size="sm" onClick={() => setShowAddBranch(true)} className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" />
              {t('addBranch')}
            </Button>
          ) : null}
        </div>

        {alerts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <div
                key={alert}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[24px] border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <StatItem
          label={t('workspace.stats.todayRevenue')}
          value={fmt(overview.total_today_revenue, currency, locale)}
          sub={t('workspace.stats.todayRevenueHint', {
            count: overview.total_open_orders,
          })}
        />
        <StatItem
          label={t('workspace.stats.totalExpenses')}
          value={fmt(overview.total_month_spending, currency, locale)}
          sub={t('workspace.stats.totalExpensesHint')}
        />
        <StatItem
          label={t('workspace.stats.branchesReady')}
          value={`${branches.length - setupNeededCount}/${branches.length}`}
          sub={
            setupNeededCount > 0
              ? t('workspace.stats.branchesReadyPending', { count: setupNeededCount })
              : t('workspace.stats.branchesReadyAll')
          }
        />
        <StatItem
          label={t('workspace.stats.monthClose', { month: monthLabel })}
          value={`${overview.current_month.branches_with_snapshot}/${overview.current_month.branch_count}`}
          sub={fmt(overview.current_month.revenue_total, currency, locale)}
        />
      </div>

      {branches.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">{t('workspace.emptyTitle')}</p>
          {canAddBranch ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5 rounded-xl"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              {t('addBranch')}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3">{t('workspace.table.branch')}</TableHead>
                <TableHead className="hidden px-4 py-3 lg:table-cell">
                  {t('workspace.table.contact')}
                </TableHead>
                <TableHead className="hidden px-4 py-3 md:table-cell">
                  {t('workspace.table.today')}
                </TableHead>
                <TableHead className="hidden px-4 py-3 text-right sm:table-cell">
                  {t('workspace.table.expenses')}
                </TableHead>
                <TableHead className="px-4 py-3">{t('workspace.table.status')}</TableHead>
                <TableHead className="px-4 py-3 text-right">
                  {t('workspace.table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const branchOverview = overviewBranchById.get(branch.id);

                return (
                  <TableRow key={branch.id}>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                          <Badge variant="outline" className="rounded-full text-xs">
                            {branch.branchCode ?? branch.subdomain}
                          </Badge>
                          {branch.isActive ? (
                            <Badge variant="secondary" className="rounded-full text-xs">
                              {t('workspace.activeBranch')}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{branch.address ?? t('workspace.addressNotSet')}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:hidden">
                            {branch.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {branch.phone}
                              </span>
                            ) : null}
                            {branch.email ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {branch.email}
                              </span>
                            ) : null}
                            {!branch.phone && !branch.email ? (
                              <span>{t('workspace.contactNotSet')}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden px-4 py-3 align-top lg:table-cell">
                      <p className="text-sm text-slate-600">
                        {formatContact(branch, t('workspace.contactNotSet'))}
                      </p>
                    </TableCell>

                    <TableCell className="hidden px-4 py-3 align-top md:table-cell">
                      <div className="space-y-0.5 text-sm">
                        <p className="font-medium text-slate-900">
                          {fmt(branchOverview?.today_revenue ?? 0, currency, locale)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('workspace.openOrdersCount', {
                            count: branchOverview?.open_orders_count ?? 0,
                          })}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="hidden px-4 py-3 text-right align-top sm:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium tabular-nums text-slate-900">
                          {fmt(branchOverview?.monthly_spending ?? 0, currency, locale)}
                        </p>
                        <p className="text-xs text-slate-500">{t('workspace.expensesThisMonth')}</p>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        {branch.onboarded ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            {t('workspace.ready')}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                          >
                            {t('workspace.setupNeeded')}
                          </Badge>
                        )}
                        {branchOverview?.has_closed_snapshot ? (
                          <div className="hidden text-xs text-emerald-700 md:flex md:items-center md:gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t('workspace.monthClosed')}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={() => router.push(`/${locale}/control/restaurants/${branch.id}`)}
                        >
                          {t('workspace.actions.ownerView')}
                        </Button>
                        <OwnerBranchExpenseDialog
                          branchId={branch.id}
                          branchName={branch.name}
                          currency={currency}
                          label={tPurchasing('addExpense')}
                          className="w-full rounded-xl sm:w-auto"
                        />
                        <BranchScopedLinkButton
                          restaurantId={branch.id}
                          href={`/${locale}/branch`}
                          label={t('workspace.actions.branchManage')}
                          size="sm"
                          className="w-full rounded-xl sm:w-auto"
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
