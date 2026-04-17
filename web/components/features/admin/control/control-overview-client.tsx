'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
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
import { cn } from '@/lib/utils';
import type { FounderControlOverviewData } from '@/lib/server/control/overview';

interface ControlOverviewClientProps {
  data: FounderControlOverviewData;
  locale: string;
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

function fmtCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return String(Math.round(amount));
}

function StatItem({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'amber' | 'green' | 'sky';
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-xl font-semibold tabular-nums',
          tone === 'amber' && 'text-amber-600',
          tone === 'green' && 'text-emerald-600',
          tone === 'sky' && 'text-sky-600'
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  empty,
  emptyText,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {empty ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          <div className="text-center space-y-1">
            <TrendingUp className="h-6 w-6 mx-auto opacity-30" />
            <p>{emptyText ?? 'No data yet'}</p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Custom tooltip for currency values
function CurrencyTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium tabular-nums">{fmt(entry.value, currency, locale)}</span>
        </div>
      ))}
    </div>
  );
}

function OrdersTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {entry.name === 'revenue'
              ? fmt(entry.value, currency, locale)
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ControlOverviewClient({
  data,
  locale,
  currency,
}: ControlOverviewClientProps) {
  const appLocale = useLocale();
  const router = useRouter();

  const monthLabel = `${data.current_month.year}/${String(data.current_month.month).padStart(2, '0')}`;

  const navigateToBranch = (restaurantId: string, tab?: string) => {
    const base = `/${appLocale}/control/restaurants/${restaurantId}`;
    router.push(tab ? `${base}?tab=${tab}` : base);
  };

  // Alerts to show
  const alerts = [
    data.attention.branches_missing_snapshot > 0 && {
      key: 'missing-close',
      text: `${data.attention.branches_missing_snapshot} branch${data.attention.branches_missing_snapshot > 1 ? 'es' : ''} still need month close`,
      tone: 'amber' as const,
    },
    data.attention.branches_without_employees > 0 && {
      key: 'unstaffed',
      text: `${data.attention.branches_without_employees} branch${data.attention.branches_without_employees > 1 ? 'es' : ''} without employees`,
      tone: 'amber' as const,
    },
  ].filter(Boolean) as Array<{ key: string; text: string; tone: 'amber' }>;

  // Chart: daily revenue — abbreviate x-axis labels (show every 5th day)
  const dailyChartData = data.daily_revenue_30d.map((d) => ({
    ...d,
    dayLabel: d.date.slice(5), // "MM-DD"
  }));
  const hasDailyData = dailyChartData.some((d) => d.revenue > 0);

  // Chart: monthly trend
  const hasMonthlyData = data.monthly_trend_6m.some((m) => m.revenue > 0 || m.gross_profit > 0);

  // Chart: top items (horizontal bar)
  const hasTopItems = data.top_items_30d.length > 0;

  // Chart: branch revenue comparison
  const hasBranchRevenue = data.branch_revenue.length > 0;

  return (
    <div className="space-y-6">
      {/* Attention bar */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <div
              key={a.key}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {a.text}
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <StatItem
          label="Today revenue"
          value={fmt(data.total_today_revenue, currency, locale)}
          sub={`${data.branches.length} branches`}
          tone="green"
        />
        <StatItem
          label="Open orders"
          value={data.total_open_orders.toString()}
          sub={`${data.branches_with_open_orders} branches`}
          tone={data.total_open_orders > 0 ? 'sky' : undefined}
        />
        <StatItem
          label="Employees"
          value={data.total_employees.toString()}
          sub={`${data.branches_with_employees} staffed branches`}
        />
        <StatItem
          label={`Month close (${monthLabel})`}
          value={`${data.current_month.branches_with_snapshot}/${data.current_month.branch_count}`}
          tone={
            data.current_month.branches_with_snapshot < data.current_month.branch_count
              ? 'amber'
              : 'green'
          }
        />
      </div>

      {/* Month finance row */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <StatItem
          label={`${monthLabel} revenue`}
          value={fmt(data.current_month.revenue_total, currency, locale)}
        />
        <StatItem
          label="Costs"
          value={fmt(data.current_month.combined_cost_total, currency, locale)}
          sub="Closed snapshots only"
        />
        <StatItem
          label="Gross profit"
          value={fmt(data.current_month.gross_profit_estimate, currency, locale)}
          tone="green"
        />
        <StatItem
          label="Approved labor"
          value={`${data.current_month.approved_labor_hours.toFixed(1)}h`}
          sub="Closed snapshots only"
        />
      </div>

      {/* ── Charts row 1: Daily revenue + Monthly trend ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 30-day daily revenue area chart */}
        <ChartCard
          title="Revenue last 30 days"
          subtitle="Completed orders across all branches"
          empty={!hasDailyData}
          emptyText="No completed orders in the last 30 days"
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtCompact(v)}
                width={44}
              />
              <Tooltip
                content={
                  <OrdersTooltip currency={currency} locale={locale} />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6-month revenue vs gross profit bar chart */}
        <ChartCard
          title="Monthly revenue vs profit"
          subtitle="Last 6 months — closed snapshots only"
          empty={!hasMonthlyData}
          emptyText="No closed monthly snapshots yet"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthly_trend_6m} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtCompact(v)}
                width={44}
              />
              <Tooltip
                content={<CurrencyTooltip currency={currency} locale={locale} />}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gross_profit" name="Gross profit" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2: Top items + Branch comparison ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top menu items horizontal bar */}
        <ChartCard
          title="Top menu items (30 days)"
          subtitle="By quantity sold across all branches"
          empty={!hasTopItems}
          emptyText="No order items in the last 30 days"
        >
          <div className="space-y-2 pt-1">
            {data.top_items_30d.map((item, i) => {
              const max = data.top_items_30d[0]?.quantity ?? 1;
              const pct = Math.round((item.quantity / max) * 100);
              return (
                <div key={item.name} className="group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs truncate max-w-[65%] text-foreground">{item.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      ×{item.quantity} · {fmt(item.revenue, currency, locale)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-sky-400'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Branch revenue comparison */}
        <ChartCard
          title="Branch revenue this month"
          subtitle="Closed snapshots only"
          empty={!hasBranchRevenue}
          emptyText="No branches have closed this month yet"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.branch_revenue}
              layout="vertical"
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtCompact(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                content={<CurrencyTooltip currency={currency} locale={locale} />}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0, 3, 3, 0]} />
              <Bar dataKey="gross_profit" name="Gross profit" fill="#10b981" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Branch table */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Branches</h2>
        {data.branches.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            No accessible branches found.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Restaurant</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Today rev</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Orders</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Team</TableHead>
                  <TableHead className="text-center">Month close</TableHead>
                  <TableHead className="text-right pr-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.branches.map((branch) => {
                  return (
                    <TableRow
                      key={branch.restaurant_id}
                      className="cursor-pointer"
                      onClick={() => navigateToBranch(branch.restaurant_id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-tight truncate max-w-32">{branch.name}</p>
                            <p className="text-[11px] text-muted-foreground hidden sm:block">{branch.subdomain}.coorder.ai</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell tabular-nums text-sm">
                        {fmt(branch.today_revenue, currency, locale)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center h-5 w-5 rounded text-xs font-medium',
                            branch.open_orders_count > 0
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {branch.open_orders_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell text-sm text-muted-foreground">
                        {branch.employee_count}
                      </TableCell>
                      <TableCell className="text-center">
                        {branch.has_closed_snapshot ? (
                          <div className="flex items-center justify-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs hidden sm:inline tabular-nums">
                              {fmt(branch.monthly_revenue, currency, locale)}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 rounded-lg text-xs"
                            onClick={() => navigateToBranch(branch.restaurant_id, 'team')}
                          >
                            <Users className="h-3 w-3" />
                            <span className="hidden sm:inline">Team</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 rounded-lg text-xs"
                            onClick={() => router.push(`/${appLocale}/control/finance`)}
                          >
                            <CircleDollarSign className="h-3 w-3" />
                            <span className="hidden sm:inline">Finance</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
