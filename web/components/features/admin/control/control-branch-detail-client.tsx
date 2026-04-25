"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { BranchScopedLinkButton } from "@/components/features/admin/control/branch-scoped-link-button";
import {
  ControlBranchSetupPanel,
  type BranchSetupState,
} from "@/components/features/admin/control/control-branch-setup-panel";
import { ControlBranchTeamPanel } from "@/components/features/admin/control/control-branch-team-panel";
import { OwnerBranchExpenseDialog } from "@/components/features/admin/control/owner-branch-expense-dialog";
import { BranchFinanceWorkspace } from "@/components/features/admin/finance/branch-finance-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { normalizeOpeningHours } from "@/lib/utils/opening-hours";
import { cn } from "@/lib/utils";
import type { OrgEmployeeRow } from "@/lib/server/organizations/queries";
import type { BranchOverviewData } from "@/lib/server/control/branch-overview";
import type { BranchFinanceDetailData } from "@/lib/server/control/branch-finance-detail";
import type { BranchTeamPayrollData } from "@/lib/server/control/branch-team";
import type {
  MonthlyFinanceReport,
  MonthlyFinanceSnapshot,
} from "@/lib/server/finance/types";
import type {
  BranchSettings,
  BranchDetailTab,
} from "@/app/[locale]/(control)/control/restaurants/[branchId]/page";

interface ControlBranchDetailClientProps {
  branch: BranchSettings;
  employees: OrgEmployeeRow[];
  overview: BranchOverviewData;
  teamPayroll: BranchTeamPayrollData;
  initialTab: BranchDetailTab;
  currency: string;
  orgTimezone: string;
  canViewFinance: boolean;
  financeReport: MonthlyFinanceReport | null;
  financeHistory: MonthlyFinanceSnapshot[];
  financeYear: number;
  financeMonth: number;
  canCloseFinance: boolean;
  canExportFinance: boolean;
  canViewFinanceIncome: boolean;
  canViewFinanceSpending: boolean;
  canManageExpenses: boolean;
  financeDetail: BranchFinanceDetailData | null;
}

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

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(Math.round(amount));
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

function ChartPanel({
  title,
  subtitle,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-4 text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/10 backdrop-blur-xl">
      <div className="mb-4">
        <p className="text-sm font-medium">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-[#C9B7A0]">{subtitle}</p>
        ) : null}
      </div>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-[#F1DCC4]/18 bg-[#FFF7E9]/[0.04] text-sm text-[#C9B7A0]">
          <div className="space-y-2 text-center">
            <BarChart3 className="mx-auto h-6 w-6 text-[#E9A35E]" />
            <p>{emptyText}</p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

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
    <div className="rounded-lg border border-[#F1DCC4]/14 bg-[#14100B] px-3 py-2 text-xs text-[#FFF7E9] shadow-xl">
      <p className="mb-1.5 font-medium text-[#C9B7A0]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-[#C9B7A0]">{entry.name}:</span>
          <span className="font-medium tabular-nums text-[#FFF7E9]">
            {formatCurrency(entry.value, currency, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HoursTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[#F1DCC4]/14 bg-[#14100B] px-3 py-2 text-xs text-[#FFF7E9] shadow-xl">
      <p className="mb-1.5 font-medium text-[#C9B7A0]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-[#C9B7A0]">{entry.name}:</span>
          <span className="font-medium tabular-nums text-[#FFF7E9]">
            {formatHours(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ControlBranchDetailClient({
  branch: initialBranch,
  employees: initialEmployees,
  overview,
  teamPayroll,
  initialTab,
  currency,
  canViewFinance,
  financeReport,
  financeHistory,
  financeYear,
  financeMonth,
  canCloseFinance,
  canExportFinance,
  canViewFinanceIncome,
  canViewFinanceSpending,
  canManageExpenses,
  financeDetail,
}: ControlBranchDetailClientProps) {
  const appLocale = useLocale();
  const t = useTranslations("owner.control.branchDetail");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BranchDetailTab>(initialTab);

  const timezoneOptions = [
    { value: "Asia/Tokyo", label: t("options.timezones.asiaTokyo") },
    { value: "Asia/Ho_Chi_Minh", label: t("options.timezones.asiaHoChiMinh") },
    { value: "Asia/Singapore", label: t("options.timezones.asiaSingapore") },
    { value: "UTC", label: t("options.timezones.utc") },
  ];
  const currencyOptions = [
    { value: "JPY", label: t("options.currencies.jpy") },
    { value: "VND", label: t("options.currencies.vnd") },
    { value: "USD", label: t("options.currencies.usd") },
    { value: "SGD", label: t("options.currencies.sgd") },
  ];
  const languageOptions = [
    { value: "ja", label: t("options.languages.ja") },
    { value: "en", label: t("options.languages.en") },
    { value: "vi", label: t("options.languages.vi") },
  ];
  const jobTitleOptions = [
    { value: "manager", label: t("options.roles.manager") },
    { value: "chef", label: t("options.roles.chef") },
    { value: "server", label: t("options.roles.server") },
    { value: "cashier", label: t("options.roles.cashier") },
  ];

  const tabs: Array<{ key: BranchDetailTab; label: string }> = [
    { key: "overview", label: t("tabs.overview") },
    ...(canViewFinance
      ? [{ key: "finance" as const, label: t("tabs.finance") }]
      : []),
    { key: "team", label: t("tabs.staff") },
    { key: "setup", label: t("tabs.setup") },
  ];

  const [settings, setSettings] = useState<BranchSetupState>({
    name: initialBranch.name,
    address: initialBranch.address ?? "",
    phone: initialBranch.phone ?? "",
    email: initialBranch.email ?? "",
    timezone: initialBranch.timezone ?? "Asia/Tokyo",
    currency: initialBranch.currency ?? "JPY",
    tax:
      initialBranch.tax != null
        ? String(Math.round(initialBranch.tax * 100))
        : "10",
    default_language: initialBranch.default_language ?? "ja",
    opening_hours: normalizeOpeningHours(initialBranch.opening_hours),
  });
  const [savingSetup, setSavingSetup] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    job_title: "server",
  });
  const [addingEmployee, setAddingEmployee] = useState(false);

  const employees = initialEmployees;
  const monthLabel = `${overview.month.year}/${String(overview.month.month).padStart(2, "0")}`;
  const revenueTrendData = overview.sales_last_14d.map((point) => ({
    ...point,
    dayLabel: point.date.slice(5),
  }));
  const hasRevenueTrend = revenueTrendData.some((point) => point.revenue > 0);
  const hoursByEmployeeData = useMemo(
    () =>
      teamPayroll.employees
        .map((employee) => ({
          name: employee.name,
          shortName:
            employee.name.length > 12
              ? `${employee.name.slice(0, 12)}...`
              : employee.name,
          approvedHours: employee.approvedHours,
          pendingHours: employee.pendingHours,
        }))
        .sort(
          (left, right) =>
            right.approvedHours +
            right.pendingHours -
            (left.approvedHours + left.pendingHours),
        )
        .slice(0, 8),
    [teamPayroll.employees],
  );
  const hasHoursData = hoursByEmployeeData.some(
    (employee) => employee.approvedHours > 0 || employee.pendingHours > 0,
  );
  const hasTopItems = overview.top_items_30d.length > 0;
  const topSellingItem = overview.top_items_30d[0] ?? null;
  const financeCurrency = initialBranch.currency ?? currency;

  const handleSaveSetup = async (
    nextSettings: BranchSetupState,
  ): Promise<boolean> => {
    setSavingSetup(true);
    try {
      const taxDecimal = parseFloat(nextSettings.tax) / 100;
      const res = await fetch(
        `/api/v1/owner/organization/restaurants/${initialBranch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nextSettings.name || undefined,
            address: nextSettings.address || null,
            phone: nextSettings.phone || null,
            email: nextSettings.email || null,
            timezone: nextSettings.timezone || null,
            currency: nextSettings.currency || null,
            tax: !isNaN(taxDecimal) ? taxDecimal : undefined,
            default_language: nextSettings.default_language || undefined,
            opening_hours: nextSettings.opening_hours,
            mark_ready: initialBranch.onboarded !== true,
          }),
        },
      );

      if (res.ok) {
        setSettings(nextSettings);
        toast.success(t("toasts.saveSetupSuccess"));
        router.refresh();
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? t("toasts.saveSetupError"));
        return false;
      }
    } catch {
      toast.error(t("toasts.saveSetupError"));
      return false;
    } finally {
      setSavingSetup(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error(t("toasts.employeeNameEmailRequired"));
      return;
    }

    setAddingEmployee(true);
    try {
      const res = await fetch("/api/v1/owner/organization/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: initialBranch.id,
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          job_title: addForm.job_title,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(data.message ?? t("toasts.employeeInviteSuccess"));
        setShowAddEmployee(false);
        setAddForm({ name: "", email: "", job_title: "server" });
        router.refresh();
      } else {
        toast.error(data.error ?? t("toasts.employeeInviteError"));
      }
    } finally {
      setAddingEmployee(false);
    }
  };

  const switchTab = (tab: BranchDetailTab) => {
    setActiveTab(tab);
    const base = `/${appLocale}/control/restaurants/${initialBranch.id}`;
    const url = tab === "overview" ? base : `${base}?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-xl bg-[#14100B] p-5 text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/18">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-8 shrink-0 rounded-lg px-2 text-[#DBC7AD] hover:bg-[#FFF7E9]/10 hover:text-[#FFF7E9]"
            onClick={() => router.push(`/${appLocale}/control/restaurants`)}
            aria-label={t("backToRestaurants")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">
              {t("backToRestaurants")}
            </span>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF7E9]/10">
                <Building2 className="h-4 w-4 text-[#E9A35E]" />
              </div>
              <h1 className="truncate text-2xl font-semibold leading-tight text-[#FFF7E9]">
                {initialBranch.name}
              </h1>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 pl-10">
              <Badge
                variant="outline"
                className="rounded-full border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-xs text-[#F1DCC4]"
              >
                {initialBranch.branch_code ?? initialBranch.subdomain}
              </Badge>
              {initialBranch.onboarded ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {t("status.ready")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                >
                  {t("status.setupNeeded")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-sm text-[#C9B7A0]">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>{initialBranch.subdomain}.coorder.ai</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <OwnerBranchExpenseDialog
              branchId={initialBranch.id}
              branchName={initialBranch.name}
              currency={financeCurrency}
              className="rounded-xl border-[#F1DCC4]/14 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-[#F1DCC4]/14 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
              onClick={() =>
                window.open(
                  `https://${initialBranch.subdomain}.coorder.ai`,
                  "_blank",
                )
              }
            >
              {t("actions.publicSite")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
            <BranchScopedLinkButton
              restaurantId={initialBranch.id}
              href={`/${appLocale}/branch/${initialBranch.id}`}
              label={t("actions.openBranchManage")}
              variant="default"
              size="sm"
              className="rounded-xl bg-[#C8773E] text-white hover:bg-[#A95F2F]"
              openInNewTab
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-1 text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/10 backdrop-blur-xl">
        <nav className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-[#C8773E] text-white"
                  : "text-[#C9B7A0] hover:bg-[#FFF7E9]/10 hover:text-[#FFF7E9]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-4 text-[#FFF7E9] shadow-xl shadow-[#8A4E24]/10 backdrop-blur-xl sm:grid-cols-4">
            <div className="space-y-0.5">
              <p className="text-xs text-[#C9B7A0]">{t("stats.openOrders")}</p>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  overview.open_orders_count > 0
                    ? "text-[#F2B36F]"
                    : "text-[#C9B7A0]",
                )}
              >
                {overview.open_orders_count}
              </p>
              <p className="text-xs text-[#B89078]">{t("stats.inKitchen")}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-[#C9B7A0]">
                {t("stats.monthRevenue")}
              </p>
              <p className="text-xl font-semibold tabular-nums text-[#B9D79B]">
                {formatCurrency(
                  overview.month.revenue_total,
                  financeCurrency,
                  appLocale,
                )}
              </p>
              <p className="text-xs text-[#B89078]">
                {t("stats.monthRevenueHint", { month: monthLabel })}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-[#C9B7A0]">
                {t("stats.monthSpending")}
              </p>
              <p className="text-xl font-semibold tabular-nums text-[#FFF7E9]">
                {formatCurrency(
                  overview.month.spending_total,
                  financeCurrency,
                  appLocale,
                )}
              </p>
              <p className="text-xs text-[#B89078]">
                {t("stats.monthSpendingHint")}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-[#C9B7A0]">{t("stats.openStatus")}</p>
              {overview.month.has_closed_snapshot ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-[#B9D79B]" />
                  <span className="text-sm font-medium text-[#B9D79B]">
                    {t("status.closed")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-5 w-5 text-[#F2B36F]" />
                  <span className="text-sm font-medium text-[#F2B36F]">
                    {t("status.open")}
                  </span>
                </div>
              )}
              <p className="text-xs text-[#B89078]">
                {t("stats.monthClose", { month: monthLabel })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div
              id="branch-month-snapshot"
              className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-[#F1DCC4]/10 hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-[#B89078]">
                      {t("info.tableLabel")}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-[#B89078]">
                      {t("info.tableValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.name")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {initialBranch.name}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.code")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {initialBranch.branch_code ?? initialBranch.subdomain}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.address")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {initialBranch.address ?? t("common.notSet")}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.contact")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {initialBranch.phone || initialBranch.email
                        ? [initialBranch.phone, initialBranch.email]
                            .filter(Boolean)
                            .join(" · ")
                        : t("common.notSet")}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.workingHours")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {t("info.workingHoursValue", {
                        approved: formatHours(teamPayroll.totals.approvedHours),
                        pending: formatHours(teamPayroll.totals.pendingHours),
                      })}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("info.bestSeller")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {topSellingItem
                        ? t("info.bestSellerValue", {
                            item: topSellingItem.item_name,
                            quantity: topSellingItem.quantity,
                          })
                        : t("info.noSalesYet")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#F1DCC4]/10 hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-[#B89078]">
                      {t("snapshot.tableLabel")}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-[#B89078]">
                      {t("snapshot.tableValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.period")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {monthLabel}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.status")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {overview.month.has_closed_snapshot
                        ? t("status.closed")
                        : t("status.open")}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.revenue")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {formatCurrency(
                        overview.month.revenue_total,
                        financeCurrency,
                        appLocale,
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.grossProfit")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {formatCurrency(
                        overview.month.gross_profit,
                        financeCurrency,
                        appLocale,
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.openOrders")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {t("stats.openOrdersCount", {
                        count: overview.open_orders_count,
                      })}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-[#F1DCC4]/10">
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {t("snapshot.monthSpending")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                      {formatCurrency(
                        overview.month.spending_total,
                        financeCurrency,
                        appLocale,
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartPanel
              title={t("charts.revenueTitle")}
              subtitle={t("charts.revenueSubtitle")}
              empty={!hasRevenueTrend}
              emptyText={t("charts.revenueEmpty")}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={revenueTrendData}
                  margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="branchRevenue14d"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0f766e"
                        stopOpacity={0.25}
                      />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(241, 220, 196, 0.14)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 10, fill: "#C9B7A0" }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#C9B7A0" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => formatCompact(value)}
                    width={44}
                  />
                  <Tooltip
                    content={
                      <CurrencyTooltip
                        currency={financeCurrency}
                        locale={appLocale}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f766e"
                    strokeWidth={2}
                    fill="url(#branchRevenue14d)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#0f766e" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title={t("charts.hoursTitle")}
              subtitle={t("charts.hoursSubtitle")}
              empty={!hasHoursData}
              emptyText={t("charts.hoursEmpty")}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={hoursByEmployeeData}
                  margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(241, 220, 196, 0.14)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: "#C9B7A0" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#C9B7A0" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<HoursTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: "11px",
                      paddingTop: "8px",
                      color: "#C9B7A0",
                    }}
                  />
                  <Bar
                    dataKey="approvedHours"
                    name={t("charts.approved")}
                    fill="#0f766e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingHours"
                    name={t("charts.pending")}
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div
              id="branch-best-sellers"
              className="rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-4 text-[#FFF7E9] backdrop-blur-xl"
            >
              <div className="mb-4">
                <p className="text-sm font-medium">{t("bestSellers.title")}</p>
                <p className="mt-0.5 text-xs text-[#C9B7A0]">
                  {t("bestSellers.subtitle")}
                </p>
              </div>
              {hasTopItems ? (
                <div className="space-y-3">
                  {overview.top_items_30d.map((item, index) => {
                    const maxQuantity =
                      overview.top_items_30d[0]?.quantity ?? 1;
                    const width = Math.round(
                      (item.quantity / maxQuantity) * 100,
                    );

                    return (
                      <div
                        key={`${item.item_name}-${index}`}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-[#FFF7E9]">
                            {item.item_name}
                          </p>
                          <p className="text-xs tabular-nums text-[#C9B7A0]">
                            {t("bestSellers.itemMeta", {
                              quantity: item.quantity,
                              revenue: formatCurrency(
                                item.revenue,
                                financeCurrency,
                                appLocale,
                              ),
                            })}
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#FFF7E9]/10">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              index === 0
                                ? "bg-[#E9A35E]"
                                : index === 1
                                  ? "bg-[#97BE73]"
                                  : "bg-[#7AA7C7]",
                            )}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#F1DCC4]/18 px-4 py-5 text-sm text-[#C9B7A0]">
                  <Clock className="h-4 w-4 shrink-0" />
                  {t("bestSellers.empty")}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] p-4 text-[#FFF7E9] backdrop-blur-xl">
              <div className="mb-4">
                <p className="text-sm font-medium">
                  {t("hoursSnapshot.title")}
                </p>
                <p className="mt-0.5 text-xs text-[#C9B7A0]">
                  {t("hoursSnapshot.subtitle")}
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-[#FFF7E9]/8 px-4 py-3">
                  <p className="text-xs text-[#C9B7A0]">
                    {t("hoursSnapshot.approvedHours")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#B9D79B]">
                    {formatHours(teamPayroll.totals.approvedHours)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#FFF7E9]/8 px-4 py-3">
                  <p className="text-xs text-[#C9B7A0]">
                    {t("hoursSnapshot.pendingReview")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#F2B36F]">
                    {formatHours(teamPayroll.totals.pendingHours)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#FFF7E9]/8 px-4 py-3">
                  <p className="text-xs text-[#C9B7A0]">
                    {t("hoursSnapshot.reviewLabel")}
                  </p>
                  <p className="mt-1 text-sm text-[#F1DCC4]">
                    {t("hoursSnapshot.reviewBody")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
                  onClick={() => switchTab("team")}
                >
                  {t("hoursSnapshot.openTeam")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "finance" && canViewFinance && (
        <div className="space-y-4">
          <BranchFinanceWorkspace
            branchId={initialBranch.id}
            branchName={initialBranch.name}
            locale={appLocale}
            controlPath={`/${appLocale}/control/restaurants/${initialBranch.id}`}
            currency={financeCurrency}
            year={financeYear}
            month={financeMonth}
            report={financeReport}
            history={financeHistory}
            detail={financeDetail}
            canExport={canExportFinance}
            canClose={canCloseFinance}
            canViewIncome={canViewFinanceIncome}
            canViewSpending={canViewFinanceSpending}
            canManageExpenses={canManageExpenses}
          />
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-[#F1DCC4]/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{t("team.rosterTitle")}</p>
                <p className="mt-0.5 text-xs text-[#C9B7A0]">
                  {t("team.rosterDescription")}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 rounded-lg bg-[#C8773E] text-white hover:bg-[#A95F2F]"
                onClick={() => setShowAddEmployee(true)}
              >
                <Plus className="h-4 w-4" />
                {t("team.addEmployee")}
              </Button>
            </div>
            <div className="grid gap-y-4 py-4 sm:grid-cols-4">
              <div className="border-l border-[#F1DCC4]/12 px-4 first:border-l-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
                  {t("team.staff")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {employees.length}
                </p>
              </div>
              <div className="border-l border-[#F1DCC4]/12 px-4 first:border-l-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
                  {t("hoursSnapshot.approvedHours")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#B9D79B]">
                  {formatHours(teamPayroll.totals.approvedHours)}
                </p>
              </div>
              <div className="border-l border-[#F1DCC4]/12 px-4 first:border-l-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
                  {t("hoursSnapshot.pendingReview")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#F2B36F]">
                  {formatHours(teamPayroll.totals.pendingHours)}
                </p>
              </div>
              <div className="border-l border-[#F1DCC4]/12 px-4 first:border-l-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#B89078]">
                  {t("teamPanel.cards.payrollEstimate")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {teamPayroll.totals.estimatedPayroll != null
                    ? formatCurrency(
                        teamPayroll.totals.estimatedPayroll,
                        initialBranch.currency ?? currency,
                        appLocale,
                      )
                    : t("teamPanel.cards.needRoleRates")}
                </p>
              </div>
            </div>
          </section>

          {employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#F1DCC4]/18 bg-[#FFF7E9]/[0.055] py-14 text-center text-[#FFF7E9]">
              <p className="text-sm font-medium">{t("team.emptyTitle")}</p>
              <p className="mt-1 text-xs text-[#C9B7A0]">
                {t("team.emptyDescription")}
              </p>
            </div>
          ) : (
            <ControlBranchTeamPanel
              currency={initialBranch.currency ?? currency}
              data={teamPayroll}
            />
          )}

          <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
            <DialogContent className="rounded-xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("team.inviteTitle")}</DialogTitle>
                <DialogDescription>{t("team.inviteHelp")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("team.fullName")}</Label>
                  <Input
                    value={addForm.name}
                    onChange={(event) =>
                      setAddForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg text-sm"
                    placeholder={t("team.fullNamePlaceholder")}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("team.email")}</Label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(event) =>
                      setAddForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg text-sm"
                    placeholder={t("team.emailPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("team.role")}</Label>
                  <Select
                    value={addForm.job_title}
                    onValueChange={(value) =>
                      setAddForm((current) => ({
                        ...current,
                        job_title: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTitleOptions.map((job) => (
                        <SelectItem key={job.value} value={job.value}>
                          {job.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  className="rounded-lg"
                  onClick={() => {
                    setShowAddEmployee(false);
                    setAddForm({ name: "", email: "", job_title: "server" });
                  }}
                >
                  {t("team.cancel")}
                </Button>
                <Button
                  onClick={handleAddEmployee}
                  disabled={addingEmployee}
                  className="gap-1.5 rounded-lg"
                >
                  {addingEmployee ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {t("team.sendInvitation")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeTab === "setup" && (
        <ControlBranchSetupPanel
          branchId={initialBranch.id}
          subdomain={initialBranch.subdomain}
          onboarded={initialBranch.onboarded}
          settings={settings}
          onSaveSettings={handleSaveSetup}
          savingSettings={savingSetup}
          timezoneOptions={timezoneOptions}
          currencyOptions={currencyOptions}
          languageOptions={languageOptions}
          teamPayroll={teamPayroll}
          fallbackCurrency={initialBranch.currency ?? currency}
        />
      )}
    </div>
  );
}
