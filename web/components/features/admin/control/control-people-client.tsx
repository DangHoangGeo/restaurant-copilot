"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  MembersPanel,
  type OrgBranch,
} from "@/components/features/admin/organization/MembersPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type {
  BranchTeamEmployeeSummary,
  BranchTeamPayrollData,
} from "@/lib/server/control/branch-team";
import { cn } from "@/lib/utils";
import type {
  ApiOrganizationMember,
  ApiPendingInvite,
  OrgEmployee,
} from "@/shared/types/organization";
import { ORG_ROLE_LABELS } from "@/shared/types/organization";
import type { OrgMemberRole } from "@/shared/types/organization";

interface ControlPeopleClientProps {
  locale: string;
  members: ApiOrganizationMember[];
  pendingInvites: ApiPendingInvite[];
  branches: OrgBranch[];
  employees: OrgEmployee[];
  selectedBranchId: string | null;
  selectedTeamPayroll: BranchTeamPayrollData | null;
  currency: string;
  canManage: boolean;
  canViewEmployees: boolean;
}

type JobTitle = "manager" | "chef" | "server" | "cashier";

const ROLE_COLORS: Record<OrgMemberRole, string> = {
  founder_full_control:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  founder_operations:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  founder_finance:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  accountant_readonly:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  branch_general_manager:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const JOB_TITLE_LABELS: Record<JobTitle, string> = {
  manager: "Manager",
  chef: "Chef",
  server: "Server",
  cashier: "Cashier",
};

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function buildRateDraft(data: BranchTeamPayrollData | null) {
  return Object.fromEntries(
    (data?.rolePayRates ?? []).map((rate) => [
      rate.jobTitle,
      rate.hourlyRate != null ? String(rate.hourlyRate) : "",
    ]),
  ) as Record<JobTitle, string>;
}

function SalaryRatesEditor({
  branchId,
  data,
  currency,
}: {
  branchId: string;
  data: BranchTeamPayrollData;
  currency: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<Record<JobTitle, string>>(
    buildRateDraft(data),
  );
  const [saving, setSaving] = useState(false);
  const payrollCurrency =
    data.rolePayRates.find((rate) => rate.currency)?.currency ?? currency;

  useEffect(() => {
    setDraft(buildRateDraft(data));
  }, [data]);

  const handleSave = async () => {
    const rates = data.rolePayRates
      .map((rate) => {
        const rawValue = draft[rate.jobTitle]?.trim();
        if (!rawValue) return null;

        const hourlyRate = Number(rawValue);
        if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
          throw new Error(
            `Invalid rate for ${JOB_TITLE_LABELS[rate.jobTitle]}`,
          );
        }

        return {
          job_title: rate.jobTitle,
          hourly_rate: hourlyRate,
          currency: payrollCurrency,
        };
      })
      .filter(
        (
          rate,
        ): rate is {
          job_title: JobTitle;
          hourly_rate: number;
          currency: string;
        } => rate != null,
      );

    setSaving(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/role-pay-rates`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rates }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Could not save salary rates");
      }
      toast.success("Salary rates saved");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save rates",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#AB6E3C]/10 text-[#AB6E3C]">
            <WalletCards className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#24170F]">
              Salary rates
            </h3>
            <p className="text-xs text-[#7A5D45]">
              Used for this month payroll estimate
            </p>
          </div>
        </div>
        {data.totals.missingRateRoles.length > 0 ? (
          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
            {data.totals.missingRateRoles.length} missing
          </Badge>
        ) : (
          <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Ready
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.rolePayRates.map((rate) => (
          <div key={rate.jobTitle} className="space-y-1.5">
            <Label className="text-xs text-[#6F563E]">
              {JOB_TITLE_LABELS[rate.jobTitle]}
            </Label>
            <Input
              inputMode="decimal"
              value={draft[rate.jobTitle] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [rate.jobTitle]: event.target.value,
                }))
              }
              className="h-10 rounded-xl bg-white text-sm"
              placeholder={formatMoney(0, payrollCurrency, locale)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#7A5D45]">
          Payroll estimate:{" "}
          <span className="font-semibold text-[#24170F]">
            {data.totals.estimatedPayroll != null
              ? formatMoney(
                  data.totals.estimatedPayroll,
                  payrollCurrency,
                  locale,
                )
              : "needs rates"}
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          className="rounded-xl bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save rates
        </Button>
      </div>
    </section>
  );
}

export function ControlPeopleClient({
  members: initialMembers,
  pendingInvites: initialInvites,
  branches,
  employees,
  selectedBranchId,
  selectedTeamPayroll,
  currency,
  canManage,
  canViewEmployees,
}: ControlPeopleClientProps) {
  const appLocale = useLocale();
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    job_title: "server" as JobTitle,
  });

  const pendingCount = pendingInvites.filter(
    (invite) => invite.is_active && !invite.accepted_at,
  ).length;
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? null;
  const payrollCurrency =
    selectedTeamPayroll?.rolePayRates.find((rate) => rate.currency)?.currency ??
    currency;
  const branchNameById = Object.fromEntries(
    branches.map((branch) => [branch.id, branch.name]),
  );
  const employeeCountByBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const employee of employees) {
      map.set(
        employee.restaurant_id,
        (map.get(employee.restaurant_id) ?? 0) + 1,
      );
    }
    return map;
  }, [employees]);
  const selectedEmployees = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const roster = selectedTeamPayroll?.employees ?? [];
    if (!normalized) return roster;
    return roster.filter(
      (employee) =>
        employee.name.toLowerCase().includes(normalized) ||
        employee.email.toLowerCase().includes(normalized) ||
        employee.jobTitle.toLowerCase().includes(normalized),
    );
  }, [searchTerm, selectedTeamPayroll]);
  const selectedEmployee =
    selectedEmployees.find(
      (employee) => employee.employeeId === selectedEmployeeId,
    ) ??
    selectedEmployees[0] ??
    null;
  const getHourlyRate = (employee: BranchTeamEmployeeSummary) =>
    selectedTeamPayroll?.rolePayRates.find(
      (rate) => rate.jobTitle === employee.jobTitle,
    )?.hourlyRate ?? null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [membersResponse, invitesResponse] = await Promise.all([
        fetch("/api/v1/owner/organization/members"),
        fetch("/api/v1/owner/organization/invites"),
      ]);
      if (membersResponse.ok) {
        setMembers((await membersResponse.json()).members ?? []);
      }
      if (invitesResponse.ok) {
        setPendingInvites((await invitesResponse.json()).invites ?? []);
      }
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const selectBranch = (branchId: string) => {
    const params = new URLSearchParams();
    params.set("branch", branchId);
    if (selectedTeamPayroll?.monthKey) {
      params.set("month", selectedTeamPayroll.monthKey);
    }
    setSelectedEmployeeId(null);
    router.push(`/${appLocale}/control/people?${params.toString()}`, {
      scroll: false,
    });
  };

  const selectMonth = (monthKey: string) => {
    if (!selectedBranch) return;
    const params = new URLSearchParams();
    params.set("branch", selectedBranch.id);
    params.set("month", monthKey);
    setSelectedEmployeeId(null);
    router.push(`/${appLocale}/control/people?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleAddEmployee = async () => {
    if (!selectedBranch) return;
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error("Enter employee name and email");
      return;
    }

    setAddingEmployee(true);
    try {
      const response = await fetch("/api/v1/owner/organization/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: selectedBranch.id,
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          job_title: addForm.job_title,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Could not add employee");
      }
      toast.success(body.message ?? "Employee invitation sent");
      setShowAddEmployee(false);
      setAddForm({ name: "", email: "", job_title: "server" });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add employee",
      );
    } finally {
      setAddingEmployee(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-[28px] bg-[#2E2117] p-5 text-[#FFF8EE] shadow-xl shadow-[#8A4E24]/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9C7A4]">
              People
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              Employees & salary
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Employees</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {employees.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Access</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {members.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Invites</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      {canViewEmployees && branches.length > 0 ? (
        <section className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-3 pb-1">
            {branches.map((branch) => {
              const isSelected = branch.id === selectedBranch?.id;
              const employeeCount = employeeCountByBranch.get(branch.id) ?? 0;

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => selectBranch(branch.id)}
                  className={cn(
                    "min-w-[210px] rounded-[22px] border p-4 text-left shadow-sm transition-all",
                    isSelected
                      ? "border-[#AB6E3C] bg-[#FFF7E9] text-[#24170F] shadow-[#8A4E24]/10"
                      : "border-[#C8773E]/16 bg-[#FFFDF8] text-[#6F563E] hover:border-[#AB6E3C]/45",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#AB6E3C]" />
                    <p className="truncate text-sm font-semibold">
                      {branch.name}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {employeeCount} staff
                    </span>
                    {isSelected ? (
                      <span className="font-semibold text-[#A95F2F]">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-4">
          {selectedBranch && selectedTeamPayroll ? (
            <>
              <section className="overflow-hidden rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] shadow-sm shadow-[#8A4E24]/5">
                <div className="border-b border-[#EAD7BD] bg-[#FFF7E9] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A5D45]">
                        {selectedBranch.name}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#24170F]">
                        Employee salary table
                      </h2>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex h-10 items-center gap-2 rounded-xl border border-[#C8773E]/20 bg-[#FFFDF8] px-3">
                        <CalendarDays className="h-4 w-4 text-[#A95F2F]" />
                        <Input
                          type="month"
                          value={selectedTeamPayroll.monthKey}
                          onChange={(event) => selectMonth(event.target.value)}
                          className="h-9 w-[140px] border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 rounded-xl bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                        onClick={() => setShowAddEmployee((value) => !value)}
                      >
                        <Plus className="h-4 w-4" />
                        Add employee
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl border-[#C8773E]/20 bg-[#FFFDF8] text-[#6F563E]"
                        onClick={() => setShowRateEditor((value) => !value)}
                      >
                        {showRateEditor ? "Close rates" : "Edit rates"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Payroll</p>
                      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedTeamPayroll.totals.estimatedPayroll != null
                          ? formatMoney(
                              selectedTeamPayroll.totals.estimatedPayroll,
                              payrollCurrency,
                              appLocale,
                            )
                          : "Needs rates"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Approved</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedTeamPayroll.totals.approvedHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Pending</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedTeamPayroll.totals.pendingHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">
                        Missing rates
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedTeamPayroll.totals.missingRateRoles.length}
                      </p>
                    </div>
                  </div>

                  {showAddEmployee ? (
                    <div className="mt-4 rounded-2xl border border-[#C8773E]/16 bg-[#F8EBD9]/70 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px]">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#6F563E]">Name</Label>
                          <Input
                            value={addForm.name}
                            onChange={(event) =>
                              setAddForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="h-10 rounded-xl bg-[#FFFDF8]"
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#6F563E]">
                            Email
                          </Label>
                          <Input
                            type="email"
                            value={addForm.email}
                            onChange={(event) =>
                              setAddForm((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            className="h-10 rounded-xl bg-[#FFFDF8]"
                            placeholder="name@example.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#6F563E]">Role</Label>
                          <Select
                            value={addForm.job_title}
                            onValueChange={(value) =>
                              setAddForm((current) => ({
                                ...current,
                                job_title: value as JobTitle,
                              }))
                            }
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-[#FFFDF8]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(JOB_TITLE_LABELS).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                          onClick={handleAddEmployee}
                          disabled={addingEmployee}
                        >
                          {addingEmployee ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          Send invite
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-[#6F563E]"
                          onClick={() => setShowAddEmployee(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex min-h-11 items-center gap-2 rounded-2xl border border-[#C8773E]/14 bg-[#FFFDF8] px-3">
                    <Search className="h-4 w-4 text-[#9A785A]" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      placeholder="Search employees"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-[#8A4E24]"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw
                        className={cn("h-4 w-4", refreshing && "animate-spin")}
                      />
                    </Button>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-[#D8B993]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[220px] bg-[#F6E8D3]">
                            Employee
                          </TableHead>
                          <TableHead className="bg-[#F6E8D3]">Role</TableHead>
                          <TableHead className="bg-[#F6E8D3] text-right">
                            Rate
                          </TableHead>
                          <TableHead className="bg-[#F6E8D3] text-right">
                            Approved
                          </TableHead>
                          <TableHead className="bg-[#F6E8D3] text-right">
                            Pending
                          </TableHead>
                          <TableHead className="bg-[#F6E8D3] text-right">
                            Salary
                          </TableHead>
                          <TableHead className="bg-[#F6E8D3] text-right">
                            Detail
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployees.length > 0 ? (
                          selectedEmployees.map((employee) => {
                            const hourlyRate = getHourlyRate(employee);
                            const isSelected =
                              selectedEmployee?.employeeId ===
                              employee.employeeId;

                            return (
                              <TableRow
                                key={employee.employeeId}
                                className={cn(
                                  "cursor-pointer",
                                  isSelected && "bg-[#FFF7E9]",
                                )}
                                onClick={() =>
                                  setSelectedEmployeeId(employee.employeeId)
                                }
                              >
                                <TableCell className="py-3">
                                  <div>
                                    <p className="font-semibold text-[#24170F]">
                                      {employee.name}
                                    </p>
                                    <p className="text-xs text-[#7A5D45]">
                                      {employee.email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-sm text-[#6F563E]">
                                  {JOB_TITLE_LABELS[
                                    employee.jobTitle as JobTitle
                                  ] ?? employee.jobTitle}
                                </TableCell>
                                <TableCell className="py-3 text-right tabular-nums">
                                  {hourlyRate != null
                                    ? formatMoney(
                                        hourlyRate,
                                        payrollCurrency,
                                        appLocale,
                                      )
                                    : "Missing"}
                                </TableCell>
                                <TableCell className="py-3 text-right tabular-nums">
                                  {employee.approvedHours.toFixed(1)}h
                                </TableCell>
                                <TableCell className="py-3 text-right tabular-nums">
                                  {employee.pendingHours.toFixed(1)}h
                                </TableCell>
                                <TableCell className="py-3 text-right font-semibold tabular-nums text-[#24170F]">
                                  {employee.estimatedPayroll != null
                                    ? formatMoney(
                                        employee.estimatedPayroll,
                                        payrollCurrency,
                                        appLocale,
                                      )
                                    : "Rate needed"}
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-[#8A4E24]"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedEmployeeId(
                                        employee.employeeId,
                                      );
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-sm text-[#6F563E]"
                            >
                              No employees match this search.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </section>

              {selectedEmployee ? (
                <section className="rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A5D45]">
                        Employee detail
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[#24170F]">
                        {selectedEmployee.name}
                      </h3>
                      <p className="text-sm text-[#7A5D45]">
                        {selectedEmployee.email}
                      </p>
                    </div>
                    {selectedEmployee.hasException ? (
                      <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Attendance exception
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Month</p>
                      <p className="mt-1 text-sm font-semibold text-[#24170F]">
                        {selectedTeamPayroll.monthLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Rate</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {getHourlyRate(selectedEmployee) != null
                          ? formatMoney(
                              getHourlyRate(selectedEmployee) ?? 0,
                              payrollCurrency,
                              appLocale,
                            )
                          : "Missing"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Scheduled</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedEmployee.monthlyScheduledHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F6E8D3] px-3 py-3">
                      <p className="text-[11px] text-[#7A5D45]">Salary</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#24170F]">
                        {selectedEmployee.estimatedPayroll != null
                          ? formatMoney(
                              selectedEmployee.estimatedPayroll,
                              payrollCurrency,
                              appLocale,
                            )
                          : "Rate needed"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#D8B993] px-3 py-3">
                      <p className="text-xs text-[#7A5D45]">Approved hours</p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-[#24170F]">
                        {selectedEmployee.approvedHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#D8B993] px-3 py-3">
                      <p className="text-xs text-[#7A5D45]">Pending hours</p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-[#24170F]">
                        {selectedEmployee.pendingHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#D8B993] px-3 py-3">
                      <p className="text-xs text-[#7A5D45]">
                        Pending summaries
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-[#24170F]">
                        {selectedEmployee.pendingSummaries}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {showRateEditor ? (
                <SalaryRatesEditor
                  branchId={selectedBranch.id}
                  data={selectedTeamPayroll}
                  currency={currency}
                />
              ) : null}
            </>
          ) : (
            <section className="rounded-[28px] border border-dashed border-[#C8773E]/25 bg-[#FFFDF8]/70 p-10 text-center">
              <Users className="mx-auto h-8 w-8 text-[#AB6E3C]" />
              <h2 className="mt-3 text-lg font-semibold text-[#24170F]">
                Pick a branch
              </h2>
              <p className="mt-1 text-sm text-[#6F563E]">
                Open one team to manage employees, schedules, and salary.
              </p>
            </section>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#AB6E3C]/10 text-[#AB6E3C]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#24170F]">
                    Access
                  </h3>
                  <p className="text-xs text-[#7A5D45]">
                    Owners, finance, managers
                  </p>
                </div>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#C8773E]/20 bg-white text-[#6F563E]"
                  onClick={() => setShowInvitePanel((value) => !value)}
                >
                  {showInvitePanel ? "Close" : "Manage"}
                </Button>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-[#C8773E]/12 bg-white px-3 py-2"
                >
                  <p className="truncate text-sm font-medium text-[#24170F]">
                    {member.name ?? member.email}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        ROLE_COLORS[member.role] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {ORG_ROLE_LABELS[member.role] ?? member.role}
                    </span>
                    <span className="truncate text-[#7A5D45]">
                      {member.shop_scope === "selected_shops"
                        ? (member.accessible_restaurant_ids ?? [])
                            .map((id) => branchNameById[id] ?? id)
                            .join(", ") || "No branches"
                        : "All branches"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {pendingCount > 0 ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Mail className="h-3.5 w-3.5" />
                {pendingCount} pending invite{pendingCount === 1 ? "" : "s"}
              </div>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#AB6E3C]" />
              <h3 className="text-sm font-semibold text-[#24170F]">
                Branch staffing
              </h3>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#C8773E]/12">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Branch</TableHead>
                    <TableHead className="h-9 text-right text-xs">
                      Staff
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow
                      key={branch.id}
                      className="cursor-pointer"
                      onClick={() => selectBranch(branch.id)}
                    >
                      <TableCell className="py-2 text-xs font-medium">
                        {branch.name}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs">
                        {employeeCountByBranch.get(branch.id) ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!canViewEmployees ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your role can manage access, but cannot view employee payroll.
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      {showInvitePanel ? (
        <section className="rounded-[24px] border border-[#C8773E]/16 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#24170F]">
              Manage organization access
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-[#6F563E]"
              onClick={() => setShowInvitePanel(false)}
            >
              Close
            </Button>
          </div>
          <div className={refreshing ? "pointer-events-none opacity-60" : ""}>
            <MembersPanel
              members={members}
              pendingInvites={pendingInvites}
              branches={branches}
              canManage={canManage}
              onRefresh={handleRefresh}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
