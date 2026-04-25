"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentType, ReactNode } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CheckCircle2,
  ReceiptText,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FounderControlOverviewData } from "@/lib/server/control/overview";

interface ControlOverviewClientProps {
  data: FounderControlOverviewData;
  locale: string;
  currency: string;
}

interface MetricItem {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}

function fmt(amount: number, currency: string, locale: string) {
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

function fmtCompact(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: currency === "JPY" ? 0 : 1,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

function percent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function formatMonthLabel(yearMonth: string, locale: string) {
  const [year, month] = yearMonth.split("/").map(Number);
  if (!year || !month) return yearMonth;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(year, month - 1, 1),
  );
}

function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-[#fff7e9]/[0.075] shadow-[0_22px_70px_-48px_rgba(0,0,0,0.95)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

function ChartTooltip({
  label,
  rows,
}: {
  label: ReactNode;
  rows: Array<{ label: string; value: string; color: string }>;
}) {
  return (
    <div className="rounded-lg bg-[#120d08]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="font-semibold text-[#fff7e9]">{label}</p>
      <div className="mt-2 space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-36 items-center gap-2 text-[#c9b7a0]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span>{row.label}</span>
            <span className="ml-auto font-semibold text-[#fff7e9]">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <Surface className="grid divide-y divide-[#f1dcc4]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#c9b7a0]">{item.label}</p>
              <Icon className="h-4 w-4 text-[#e9a35e]" />
            </div>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-[#fff7e9]">
              {item.value}
            </p>
            <p className="mt-1 truncate text-xs text-[#b89078]">
              {item.detail}
            </p>
          </div>
        );
      })}
    </Surface>
  );
}

export function ControlOverviewClient({
  data,
  locale,
  currency,
}: ControlOverviewClientProps) {
  const appLocale = useLocale();
  const tRoot = useTranslations("owner.control");
  const t = useTranslations("owner.control.overview");
  const monthCloseProgress = percent(
    data.current_month.branches_with_snapshot,
    data.current_month.branch_count,
  );
  const localizedTrend = data.monthly_trend_6m.map((point) => ({
    ...point,
    localizedLabel: formatMonthLabel(point.yearMonth, locale),
  }));
  const branchRows = [...data.branches].sort(
    (a, b) => b.monthly_revenue - a.monthly_revenue,
  );

  const metricItems: MetricItem[] = [
    {
      label: t("todayRevenue"),
      value: fmt(data.total_today_revenue, currency, locale),
      detail: t("openOrdersNow", { count: data.total_open_orders }),
      icon: BadgeDollarSign,
    },
    {
      label: t("monthRevenue"),
      value: fmtCompact(data.current_month.revenue_total, currency, locale),
      detail: t("grossProfitValue", {
        amount: fmtCompact(
          data.current_month.gross_profit_estimate,
          currency,
          locale,
        ),
      }),
      icon: TrendingUp,
    },
    {
      label: t("monthCosts"),
      value: fmtCompact(
        data.current_month.combined_cost_total,
        currency,
        locale,
      ),
      detail: t("monthCostsHint"),
      icon: ReceiptText,
    },
    {
      label: t("monthlyCoverage"),
      value: `${monthCloseProgress}%`,
      detail: t("branchesClosed", {
        closed: data.current_month.branches_with_snapshot,
        total: data.current_month.branch_count,
      }),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e9a35e]">
            {tRoot("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#fff7e9] sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9b7a0]">
            {t("description", { count: data.branches.length })}
          </p>
        </div>
      </header>

      <MetricStrip items={metricItems} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-4">
          <SectionTitle
            kicker={t("sections.progressKicker")}
            title={t("sections.progressTitle")}
            icon={BarChart3}
          />
          <div className="mt-3 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily_revenue_30d}>
                <defs>
                  <linearGradient id="dailyRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#e9a35e" stopOpacity={0.48} />
                    <stop offset="95%" stopColor="#e9a35e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(241,220,196,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  minTickGap={26}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#b89078", fontSize: 11 }}
                  tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#b89078", fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    fmtCompact(value, currency, locale)
                  }
                />
                <Tooltip
                  cursor={{ stroke: "rgba(233,163,94,0.28)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={label}
                        rows={[
                          {
                            label: t("tooltips.revenue"),
                            value: fmt(
                              Number(payload[0]?.value ?? 0),
                              currency,
                              locale,
                            ),
                            color: "#e9a35e",
                          },
                          {
                            label: t("tooltips.expenses"),
                            value: fmt(
                              Number(payload[1]?.value ?? 0),
                              currency,
                              locale,
                            ),
                            color: "#97be73",
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#e9a35e"
                  strokeWidth={2}
                  fill="url(#dailyRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#97be73"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-4">
          <SectionTitle
            kicker={t("sections.trendKicker")}
            title={t("sections.trendTitle")}
            icon={TrendingUp}
          />
          <div className="mt-3 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localizedTrend}>
                <CartesianGrid
                  stroke="rgba(241,220,196,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="localizedLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#b89078", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(255,247,233,0.05)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={label}
                        rows={[
                          {
                            label: t("tooltips.revenue"),
                            value: fmt(
                              Number(payload[0]?.value ?? 0),
                              currency,
                              locale,
                            ),
                            color: "#e9a35e",
                          },
                          {
                            label: t("tooltips.expenses"),
                            value: fmt(
                              Number(payload[1]?.value ?? 0),
                              currency,
                              locale,
                            ),
                            color: "#97be73",
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="revenue" fill="#e9a35e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#97be73" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          kicker={t("sections.menuKicker")}
          title={t("sections.topItemsTitle")}
          emptyIcon={UtensilsCrossed}
          emptyTitle={t("empty.noSalesTitle")}
          emptyBody={t("empty.noSalesBody")}
          hasRows={data.top_items_30d.length > 0}
          headers={[t("tables.item"), t("tables.sold"), t("tables.revenue")]}
        >
          {data.top_items_30d.slice(0, 6).map((item) => (
            <tr key={item.name}>
              <td className="max-w-0 truncate py-3 pr-3 font-medium text-[#fff7e9]">
                {item.name}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums text-[#c9b7a0]">
                {item.quantity}
              </td>
              <td className="py-3 text-right tabular-nums text-[#fff7e9]">
                {fmt(item.revenue, currency, locale)}
              </td>
            </tr>
          ))}
        </DataTable>

        <Surface className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e9a35e]">
                {t("sections.payrollKicker")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#fff7e9]">
                {t("sections.payrollTitle")}
              </h2>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 rounded-md text-[#f1dcc4] hover:bg-[#fff7e9]/10 hover:text-[#fff7e9]"
            >
              <Link href={`/${appLocale}/control/people`}>
                {t("payroll.openSalary")}
              </Link>
            </Button>
          </div>

          {data.payroll_current_month.approved_hours > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-[#080705]/22 p-3">
                  <p className="text-xs text-[#b89078]">
                    {t("payroll.approved")}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold tabular-nums text-[#fff7e9]">
                    {fmt(
                      data.payroll_current_month.approved_amount,
                      currency,
                      locale,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#c9b7a0]">
                    {t("payroll.approvedHours", {
                      hours:
                        data.payroll_current_month.approved_hours.toFixed(1),
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-[#080705]/22 p-3">
                  <p className="text-xs text-[#b89078]">
                    {t("payroll.projected")}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold tabular-nums text-[#fff7e9]">
                    {fmt(
                      data.payroll_current_month.projected_month_amount,
                      currency,
                      locale,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#c9b7a0]">
                    {t("payroll.dailyAverage", {
                      amount: fmt(
                        data.payroll_current_month.average_daily_amount,
                        currency,
                        locale,
                      ),
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-[#080705]/22 p-3">
                  <p className="text-xs text-[#b89078]">
                    {t("payroll.remaining")}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold tabular-nums text-[#fff7e9]">
                    {fmt(
                      data.payroll_current_month.remaining_projection_amount,
                      currency,
                      locale,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#c9b7a0]">
                    {t("payroll.peopleCount", {
                      count: data.payroll_current_month.employees_with_hours,
                    })}
                  </p>
                </div>
              </div>

              {data.payroll_current_month.missing_rate_count > 0 ? (
                <p className="text-xs text-amber-200">
                  {t("payroll.missingRates", {
                    count: data.payroll_current_month.missing_rate_count,
                  })}
                </p>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-[#f1dcc4]/10 text-xs font-medium text-[#b89078]">
                      <th className="py-2 pr-3 text-left">
                        {t("tables.branch")}
                      </th>
                      <th className="py-2 pr-3 text-right">
                        {t("tables.hours")}
                      </th>
                      <th className="py-2 pr-3 text-right">
                        {t("tables.approvedPay")}
                      </th>
                      <th className="py-2 text-right">
                        {t("tables.projectedPay")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1dcc4]/10">
                    {data.payroll_current_month.branch_payroll
                      .slice(0, 4)
                      .map((branch) => (
                        <tr key={branch.restaurant_id}>
                          <td className="max-w-0 truncate py-3 pr-3 font-medium text-[#fff7e9]">
                            {branch.name}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums text-[#c9b7a0]">
                            {t("hoursValue", {
                              hours: branch.approved_hours.toFixed(1),
                            })}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums text-[#fff7e9]">
                            {fmt(branch.approved_amount, currency, locale)}
                          </td>
                          <td className="py-3 text-right tabular-nums text-[#fff7e9]">
                            {fmt(
                              branch.projected_month_amount,
                              currency,
                              locale,
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={t("payroll.emptyTitle")}
              body={t("payroll.emptyBody")}
            />
          )}
        </Surface>
      </div>

      <DataTable
        kicker={t("sections.branchKicker")}
        title={t("branchPerformanceTitle")}
        action={
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 rounded-md text-[#f1dcc4] hover:bg-[#fff7e9]/10 hover:text-[#fff7e9]"
          >
            <Link href={`/${appLocale}/control/restaurants`}>
              {t("sections.viewAll")}
            </Link>
          </Button>
        }
        emptyIcon={Building2}
        emptyTitle={t("empty.noBranchesTitle")}
        emptyBody={t("empty.noBranchesBody")}
        hasRows={data.branches.length > 0}
        tableClassName="min-w-[760px]"
        headers={[
          t("tables.branch"),
          t("tables.openStaff"),
          t("monthRevenue"),
          t("monthCosts"),
          t("tooltips.grossProfit"),
          t("tables.close"),
        ]}
      >
        {branchRows.slice(0, 10).map((branch) => (
          <tr key={branch.restaurant_id}>
            <td className="max-w-0 py-3 pr-3">
              <Link
                href={`/${appLocale}/control/restaurants/${branch.restaurant_id}`}
                className="font-medium text-[#fff7e9] hover:text-[#e9a35e]"
              >
                {branch.name}
              </Link>
              <p className="truncate text-xs text-[#b89078]">
                {branch.subdomain}
              </p>
            </td>
            <td className="py-3 pr-3 text-[#c9b7a0]">
              {t("openStaffValue", {
                open: branch.open_orders_count,
                staff: branch.employee_count,
              })}
            </td>
            <td className="py-3 pr-3 text-right tabular-nums text-[#fff7e9]">
              {fmt(branch.monthly_revenue, currency, locale)}
            </td>
            <td className="py-3 pr-3 text-right tabular-nums text-[#c9b7a0]">
              {fmt(branch.monthly_spending, currency, locale)}
            </td>
            <td className="py-3 pr-3 text-right tabular-nums text-[#fff7e9]">
              {fmt(branch.monthly_gross_profit, currency, locale)}
            </td>
            <td className="py-3 text-right">
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  branch.has_closed_snapshot
                    ? "bg-[#97be73]/14 text-[#c8e7a3]"
                    : "bg-amber-400/14 text-amber-200",
                )}
              >
                {branch.has_closed_snapshot
                  ? t("status.closed")
                  : t("status.open")}
              </span>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  icon: Icon,
}: {
  kicker: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e9a35e]">
          {kicker}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#fff7e9]">{title}</h2>
      </div>
      <Icon className="h-5 w-5 text-[#c9b7a0]" />
    </div>
  );
}

function DataTable({
  kicker,
  title,
  headers,
  hasRows,
  emptyIcon,
  emptyTitle,
  emptyBody,
  children,
  action,
  tableClassName,
}: {
  kicker: string;
  title: string;
  headers: string[];
  hasRows: boolean;
  emptyIcon: ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
  action?: ReactNode;
  tableClassName?: string;
}) {
  return (
    <Surface className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e9a35e]">
            {kicker}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#fff7e9]">{title}</h2>
        </div>
        {action}
      </div>
      {hasRows ? (
        <div className="overflow-x-auto">
          <table className={cn("w-full table-fixed text-sm", tableClassName)}>
            <thead>
              <tr className="border-b border-[#f1dcc4]/10 text-xs font-medium text-[#b89078]">
                {headers.map((header, index) => (
                  <th
                    key={header}
                    className={cn(
                      "py-2 pr-3 text-left",
                      index > 0 && "text-right",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1dcc4]/10">{children}</tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />
      )}
    </Surface>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[104px] items-center gap-3 rounded-lg bg-[#080705]/22 px-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#fff7e9]/8 text-[#c9b7a0]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#fff7e9]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#b89078]">{body}</p>
      </div>
    </div>
  );
}
