'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BranchTeamPayrollData } from '@/lib/server/control/branch-team';

interface ControlBranchTeamPanelProps {
  currency: string;
  data: BranchTeamPayrollData;
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ControlBranchTeamPanel({
  currency,
  data,
}: ControlBranchTeamPanelProps) {
  const locale = useLocale();
  const t = useTranslations('owner.control.branchDetail.teamPanel');
  const payrollCurrency = data.rolePayRates.find((rate) => rate.currency)?.currency ?? currency;
  const employeesWithHours = useMemo(
    () => data.employees.filter((employee) => employee.approvedHours > 0 || employee.pendingHours > 0),
    [data.employees]
  );
  const weekdayLabels: Record<number, string> = {
    1: t('weekdays.mon'),
    2: t('weekdays.tue'),
    3: t('weekdays.wed'),
    4: t('weekdays.thu'),
    5: t('weekdays.fri'),
    6: t('weekdays.sat'),
    7: t('weekdays.sun'),
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {t('cards.thisMonth')}
          </div>
          <p className="mt-3 text-lg font-semibold">{data.monthLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('cards.staffOnBranch', { count: data.totals.employeeCount })}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {t('cards.approvedHours')}
          </div>
          <p className="mt-3 text-2xl font-semibold text-emerald-600">
            {formatHours(data.totals.approvedHours)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('cards.pendingHours', { hours: formatHours(data.totals.pendingHours) })}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <WalletCards className="h-3.5 w-3.5" />
            {t('cards.payrollEstimate')}
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data.totals.estimatedPayroll != null
              ? formatMoney(data.totals.estimatedPayroll, payrollCurrency, locale)
              : t('cards.needRoleRates')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('cards.payrollHint')}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('cards.needsAttention')}
          </div>
          <p className="mt-3 text-2xl font-semibold text-amber-600">
            {data.totals.pendingSummaries}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.totals.missingRateRoles.length > 0
              ? t('cards.missingRates', {
                  roles: data.totals.missingRateRoles.map((role) => t(`roles.${role}`)).join(', '),
                })
              : t('cards.allRatesReady')}
          </p>
        </div>
      </div>

      <section className="rounded-[28px] border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{t('schedule.title')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('schedule.description')}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {t('schedule.staffCount', {
                count: employeesWithHours.length || data.employees.length,
              })}
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {data.employees.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                {t('schedule.empty')}
              </div>
            ) : (
              data.employees.map((employee) => (
                <article
                  key={employee.employeeId}
                  className="rounded-3xl border bg-muted/10 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                        <Badge variant="secondary" className="rounded-full capitalize">
                          {t(`roles.${employee.jobTitle}`)}
                        </Badge>
                        {employee.hasException ? (
                          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {t('schedule.attendanceIssue')}
                          </Badge>
                        ) : null}
                        {employee.pendingSummaries > 0 ? (
                          <Badge className="rounded-full bg-sky-100 text-sky-800 hover:bg-sky-100">
                            {t('schedule.waitingCount', { count: employee.pendingSummaries })}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{employee.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-3">
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">{t('schedule.weeklyPlan')}</p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatHours(employee.weeklyScheduledHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">{t('schedule.approved')}</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-600">
                          {formatHours(employee.approvedHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2 col-span-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">{t('schedule.salary')}</p>
                        <p className="mt-1 text-sm font-semibold">
                          {employee.estimatedPayroll != null
                            ? formatMoney(employee.estimatedPayroll, payrollCurrency, locale)
                            : t('schedule.setRate')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {t('schedule.weeklySchedule')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {employee.weeklySchedule.length > 0 ? (
                          employee.weeklySchedule.map((slot, index) => (
                            <span
                              key={`${employee.employeeId}-${slot.weekday}-${index}`}
                              className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {weekdayLabels[slot.weekday]} {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('schedule.noWeeklyTemplate')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">{t('schedule.monthPlan')}</p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatHours(employee.monthlyScheduledHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">{t('schedule.pendingReview')}</p>
                        <p className={cn(
                          'mt-1 text-sm font-semibold',
                          employee.pendingHours > 0 ? 'text-amber-600' : 'text-slate-900'
                        )}>
                          {formatHours(employee.pendingHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">{t('schedule.payrollStatus')}</p>
                        <p className="mt-1 text-sm font-semibold">
                          {employee.estimatedPayroll != null
                            ? t('schedule.ready')
                            : t('schedule.needsRate')}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
      </section>
    </div>
  );
}
