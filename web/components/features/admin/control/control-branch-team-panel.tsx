'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Loader2,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { BranchTeamPayrollData } from '@/lib/server/control/branch-team';

interface ControlBranchTeamPanelProps {
  branchId: string;
  currency: string;
  data: BranchTeamPayrollData;
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ControlBranchTeamPanel({
  branchId,
  currency,
  data,
}: ControlBranchTeamPanelProps) {
  const router = useRouter();
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(
      data.rolePayRates.map((rate) => [
        rate.jobTitle,
        rate.hourlyRate != null ? String(rate.hourlyRate) : '',
      ])
    )
  );
  const [savingRates, setSavingRates] = useState(false);

  const payrollCurrency = data.rolePayRates.find((rate) => rate.currency)?.currency ?? currency;
  const employeesWithHours = useMemo(
    () => data.employees.filter((employee) => employee.approvedHours > 0 || employee.pendingHours > 0),
    [data.employees]
  );

  const handleSaveRates = async () => {
    const payloadRates = data.rolePayRates
      .map((rate) => {
        const rawValue = rates[rate.jobTitle]?.trim();
        if (!rawValue) {
          return null;
        }

        const hourlyRate = Number(rawValue);
        if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
          throw new Error(`Enter a valid hourly rate for ${titleCase(rate.jobTitle)}`);
        }

        return {
          job_title: rate.jobTitle,
          hourly_rate: hourlyRate,
          currency: payrollCurrency,
        };
      })
      .filter(
        (
          rate
        ): rate is {
          job_title: 'manager' | 'chef' | 'server' | 'cashier';
          hourly_rate: number;
          currency: string;
        } => rate != null
      );

    setSavingRates(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/role-pay-rates`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: payloadRates }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to save hourly rates');
      }
      toast.success('Hourly rates updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save hourly rates');
    } finally {
      setSavingRates(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            This month
          </div>
          <p className="mt-3 text-lg font-semibold">{data.monthLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.totals.employeeCount} staff on this branch
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Approved hours
          </div>
          <p className="mt-3 text-2xl font-semibold text-emerald-600">
            {formatHours(data.totals.approvedHours)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatHours(data.totals.pendingHours)} still waiting for approval
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <WalletCards className="h-3.5 w-3.5" />
            Payroll estimate
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data.totals.estimatedPayroll != null
              ? formatMoney(data.totals.estimatedPayroll, payrollCurrency)
              : 'Need role rates'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on approved attendance only
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs attention
          </div>
          <p className="mt-3 text-2xl font-semibold text-amber-600">
            {data.totals.pendingSummaries}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.totals.missingRateRoles.length > 0
              ? `Missing rates for ${data.totals.missingRateRoles.map(titleCase).join(', ')}`
              : 'All active roles have pay rates set'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-[28px] border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Role hourly rates</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Set one rate per staff level so payroll can estimate month-end salary automatically.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {payrollCurrency}
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {data.rolePayRates.map((rate) => (
              <div
                key={rate.jobTitle}
                className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{titleCase(rate.jobTitle)}</p>
                  <p className="text-xs text-muted-foreground">
                    Applies to approved hours for this role
                  </p>
                </div>
                <div className="flex w-32 items-center rounded-xl border bg-background px-3">
                  <Input
                    value={rates[rate.jobTitle] ?? ''}
                    onChange={(event) =>
                      setRates((current) => ({
                        ...current,
                        [rate.jobTitle]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="0"
                    className="h-10 border-0 bg-transparent px-0 shadow-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Hours come from approved attendance summaries, not planned shifts.
            </p>
            <Button onClick={handleSaveRates} disabled={savingRates} className="rounded-xl gap-2">
              {savingRates && <Loader2 className="h-4 w-4 animate-spin" />}
              Save rates
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Schedules and salary view</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly roster, approved hours, and payroll estimate in one view.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {employeesWithHours.length || data.employees.length} staff
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {data.employees.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No staff added to this branch yet.
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
                          {employee.jobTitle}
                        </Badge>
                        {employee.hasException ? (
                          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Attendance issue
                          </Badge>
                        ) : null}
                        {employee.pendingSummaries > 0 ? (
                          <Badge className="rounded-full bg-sky-100 text-sky-800 hover:bg-sky-100">
                            {employee.pendingSummaries} waiting
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{employee.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-3">
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Weekly plan</p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatHours(employee.weeklyScheduledHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Approved</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-600">
                          {formatHours(employee.approvedHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2 col-span-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="mt-1 text-sm font-semibold">
                          {employee.estimatedPayroll != null
                            ? formatMoney(employee.estimatedPayroll, payrollCurrency)
                            : 'Set rate'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Weekly schedule
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {employee.weeklySchedule.length > 0 ? (
                          employee.weeklySchedule.map((slot, index) => (
                            <span
                              key={`${employee.employeeId}-${slot.weekday}-${index}`}
                              className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {WEEKDAY_LABELS[slot.weekday]} {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No weekly shift template yet.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Month plan</p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatHours(employee.monthlyScheduledHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Pending review</p>
                        <p className={cn(
                          'mt-1 text-sm font-semibold',
                          employee.pendingHours > 0 ? 'text-amber-600' : 'text-slate-900'
                        )}>
                          {formatHours(employee.pendingHours)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Payroll status</p>
                        <p className="mt-1 text-sm font-semibold">
                          {employee.estimatedPayroll != null
                            ? 'Ready'
                            : 'Needs rate'}
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
    </div>
  );
}
