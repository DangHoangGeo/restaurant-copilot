"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Eye,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  MembersPanel,
  type OrgBranch,
} from "@/components/features/admin/organization/MembersPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { BranchTeamPayrollData } from "@/lib/server/control/branch-team";
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

type JobTitle = "manager" | "chef" | "server" | "cashier" | "part_time";

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
  part_time: "Part-time",
};

const GLASS_PANEL =
  "border border-[rgba(241,220,196,0.14)] bg-[#1A130D]/72 text-[#FFF8EE] shadow-xl shadow-[#080705]/25 backdrop-blur-xl";
const GLASS_SUB_PANEL =
  "border border-[rgba(241,220,196,0.12)] bg-[#FFF7E9]/8 text-[#FFF8EE] backdrop-blur-md";
const GLASS_INPUT =
  "border-[rgba(241,220,196,0.16)] bg-[#080705]/35 text-[#FFF8EE] placeholder:text-[#C9B7A0]/55 focus-visible:ring-[#C8773E]/35";
const GLASS_TABLE_HEAD = "bg-[#2E2117]/92 text-[#E9C7A4]";
const GLASS_BUTTON =
  "border-[rgba(241,220,196,0.18)] bg-[#FFF7E9]/8 text-[#F6E8D3] hover:bg-[#FFF7E9]/14 hover:text-white";
const DARK_TEXT = "text-[#FFF8EE]";
const MUTED_TEXT = "text-[#C9B7A0]";

function maskValue(value: string | null | undefined): string {
  if (!value) return "Not set";
  if (value.length <= 4) return "••••";
  return `•••• ${value.slice(-4)}`;
}

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
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [closeSalaryOpen, setCloseSalaryOpen] = useState(false);
  const [closingSalary, setClosingSalary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    job_title: "server" as JobTitle,
    restaurant_id: selectedBranchId ?? branches[0]?.id ?? "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    job_title: "server" as JobTitle,
    gender: "",
    phone: "",
    contact_email: "",
    address: "",
    facebook_url: "",
    bank_name: "",
    bank_branch_name: "",
    bank_account_type: "",
    bank_account_number: "",
    bank_account_holder: "",
    tax_social_number: "",
    insurance_number: "",
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
    const roster = employees.filter((employee) => {
      if (branchFilter !== "all" && employee.restaurant_id !== branchFilter) {
        return false;
      }
      if (!normalized) return true;
      return (
        employee.name.toLowerCase().includes(normalized) ||
        employee.email.toLowerCase().includes(normalized) ||
        employee.job_title.toLowerCase().includes(normalized) ||
        employee.restaurant_name.toLowerCase().includes(normalized)
      );
    });
    return roster;
  }, [branchFilter, employees, searchTerm]);
  const selectedEmployee =
    selectedEmployees.find(
      (employee) => employee.employee_id === selectedEmployeeId,
    ) ?? null;
  const selectedEmployeePayroll =
    selectedTeamPayroll?.employees.find(
      (employee) => employee.employeeId === selectedEmployee?.employee_id,
    ) ?? null;
  const selectedEmployeeRate =
    selectedEmployeePayroll && selectedTeamPayroll
      ? (selectedTeamPayroll.rolePayRates.find(
          (rate) => rate.jobTitle === selectedEmployeePayroll.jobTitle,
        )?.hourlyRate ?? null)
      : null;
  const canCloseSalary =
    Boolean(selectedBranch && selectedTeamPayroll) &&
    selectedTeamPayroll?.totals.estimatedPayroll != null &&
    selectedTeamPayroll.totals.missingRateRoles.length === 0;

  useEffect(() => {
    if (!selectedEmployee) return;
    setProfileForm({
      name: selectedEmployee.name,
      job_title: selectedEmployee.job_title as JobTitle,
      gender: selectedEmployee.private_profile?.gender ?? "",
      phone: selectedEmployee.private_profile?.phone ?? "",
      contact_email: selectedEmployee.private_profile?.contact_email ?? "",
      address: selectedEmployee.private_profile?.address ?? "",
      facebook_url: selectedEmployee.private_profile?.facebook_url ?? "",
      bank_name: selectedEmployee.private_profile?.bank_name ?? "",
      bank_branch_name:
        selectedEmployee.private_profile?.bank_branch_name ?? "",
      bank_account_type:
        selectedEmployee.private_profile?.bank_account_type ?? "",
      bank_account_number: "",
      bank_account_holder:
        selectedEmployee.private_profile?.bank_account_holder ?? "",
      tax_social_number:
        selectedEmployee.private_profile?.tax_social_number ?? "",
      insurance_number:
        selectedEmployee.private_profile?.insurance_number ?? "",
    });
    setEditingProfile(false);
  }, [selectedEmployee]);

  useEffect(() => {
    setAddForm((current) => ({
      ...current,
      restaurant_id:
        current.restaurant_id || selectedBranchId || branches[0]?.id || "",
    }));
  }, [branches, selectedBranchId]);

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
    if (!addForm.restaurant_id) return;
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
          restaurant_id: addForm.restaurant_id,
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
      setAddEmployeeOpen(false);
      setAddForm((current) => ({
        name: "",
        email: "",
        job_title: "server",
        restaurant_id: current.restaurant_id,
      }));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add employee",
      );
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedEmployee) return;
    setSavingProfile(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/employees/${selectedEmployee.employee_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileForm),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Could not save staff profile");
      }
      toast.success("Staff profile saved");
      setEditingProfile(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCloseSalary = async () => {
    if (!selectedBranch || !selectedTeamPayroll) return;
    setClosingSalary(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/restaurants/${selectedBranch.id}/salary-close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month_key: selectedTeamPayroll.monthKey }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not close salary");
      toast.success("Salary closed");
      setCloseSalaryOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not close salary",
      );
    } finally {
      setClosingSalary(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-[10px] bg-[#2E2117] p-5 text-[#FFF8EE] shadow-xl shadow-[#8A4E24]/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9C7A4]">
              Staff
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              Company staff
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-[8px] bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Staff</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {employees.length}
              </p>
            </div>
            <div className="rounded-[8px] bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Access</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {members.length}
              </p>
            </div>
            <div className="rounded-[8px] bg-white/10 px-3 py-2">
              <p className="text-[#E9D5BD]">Invites</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-4">
          <section
            className={cn("overflow-hidden rounded-[10px]", GLASS_PANEL)}
          >
            <div className="border-b border-[rgba(241,220,196,0.12)] bg-[#FFF7E9]/8 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9C7A4]">
                    Directory
                  </p>
                  <h2 className={cn("mt-1 text-xl font-semibold", DARK_TEXT)}>
                    Staff list
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("h-10 rounded-[8px]", GLASS_BUTTON)}
                    onClick={() => setCloseSalaryOpen(true)}
                    disabled={!canCloseSalary}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Close salary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 rounded-[8px] bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                    onClick={() => setAddEmployeeOpen(true)}
                    disabled={!canManage || branches.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Add staff
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4">
              {selectedTeamPayroll ? (
                <div className="mb-4 grid gap-2 sm:grid-cols-4">
                  <div
                    className={cn("rounded-[8px] px-3 py-3", GLASS_SUB_PANEL)}
                  >
                    <p className={cn("text-[11px]", MUTED_TEXT)}>Payroll</p>
                    <p
                      className={cn(
                        "mt-1 truncate text-sm font-semibold tabular-nums",
                        DARK_TEXT,
                      )}
                    >
                      {selectedTeamPayroll.totals.estimatedPayroll != null
                        ? formatMoney(
                            selectedTeamPayroll.totals.estimatedPayroll,
                            payrollCurrency,
                            appLocale,
                          )
                        : "Needs rates"}
                    </p>
                  </div>
                  <div
                    className={cn("rounded-[8px] px-3 py-3", GLASS_SUB_PANEL)}
                  >
                    <p className={cn("text-[11px]", MUTED_TEXT)}>Approved</p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold tabular-nums",
                        DARK_TEXT,
                      )}
                    >
                      {selectedTeamPayroll.totals.approvedHours.toFixed(1)}h
                    </p>
                  </div>
                  <div
                    className={cn("rounded-[8px] px-3 py-3", GLASS_SUB_PANEL)}
                  >
                    <p className={cn("text-[11px]", MUTED_TEXT)}>Pending</p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold tabular-nums",
                        DARK_TEXT,
                      )}
                    >
                      {selectedTeamPayroll.totals.pendingHours.toFixed(1)}h
                    </p>
                  </div>
                  <div
                    className={cn("rounded-[8px] px-3 py-3", GLASS_SUB_PANEL)}
                  >
                    <p className={cn("text-[11px]", MUTED_TEXT)}>Branch</p>
                    <p
                      className={cn(
                        "mt-1 truncate text-sm font-semibold",
                        DARK_TEXT,
                      )}
                    >
                      {selectedBranch?.name ?? "No branch"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
                <div
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-[8px] px-3",
                    GLASS_SUB_PANEL,
                  )}
                >
                  <Search className="h-4 w-4 text-[#9A785A]" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-9 border-0 bg-transparent px-0 text-[#FFF8EE] shadow-none placeholder:text-[#C9B7A0]/55 focus-visible:ring-0"
                    placeholder="Search staff"
                  />
                </div>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger
                    className={cn("h-10 rounded-[8px]", GLASS_INPUT)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedBranch?.id ?? ""}
                  onValueChange={selectBranch}
                  disabled={branches.length === 0}
                >
                  <SelectTrigger
                    className={cn("h-10 rounded-[8px]", GLASS_INPUT)}
                  >
                    <SelectValue placeholder="Payroll branch" />
                  </SelectTrigger>
                  <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-[8px] px-3",
                    GLASS_SUB_PANEL,
                  )}
                >
                  <CalendarDays className="h-4 w-4 text-[#A95F2F]" />
                  <Input
                    type="month"
                    value={selectedTeamPayroll?.monthKey ?? ""}
                    onChange={(event) => selectMonth(event.target.value)}
                    className="h-9 border-0 bg-transparent px-0 text-sm text-[#FFF8EE] shadow-none focus-visible:ring-0"
                    disabled={!selectedBranch}
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-[8px] border border-[rgba(241,220,196,0.14)] bg-[#080705]/22">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        className={cn("min-w-[220px]", GLASS_TABLE_HEAD)}
                      >
                        Staff
                      </TableHead>
                      <TableHead className={GLASS_TABLE_HEAD}>Role</TableHead>
                      <TableHead className={GLASS_TABLE_HEAD}>Branch</TableHead>
                      <TableHead className={GLASS_TABLE_HEAD}>Status</TableHead>
                      <TableHead className={cn(GLASS_TABLE_HEAD, "text-right")}>
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canViewEmployees && selectedEmployees.length > 0 ? (
                      selectedEmployees.map((employee) => (
                        <TableRow
                          key={employee.employee_id}
                          className="border-[rgba(241,220,196,0.08)] hover:bg-[#FFF7E9]/6"
                        >
                          <TableCell className="py-3">
                            <div>
                              <p className={cn("font-semibold", DARK_TEXT)}>
                                {employee.name}
                              </p>
                              <p className={cn("text-xs", MUTED_TEXT)}>
                                {maskValue(employee.email)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className={cn("py-3 text-sm", MUTED_TEXT)}>
                            {JOB_TITLE_LABELS[employee.job_title as JobTitle] ??
                              employee.job_title}
                          </TableCell>
                          <TableCell className={cn("py-3 text-sm", MUTED_TEXT)}>
                            {employee.restaurant_name}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              className={cn(
                                "rounded-[6px]",
                                employee.is_active
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  : "bg-stone-200 text-stone-700 hover:bg-stone-200",
                              )}
                            >
                              {employee.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-[8px] text-[#E9A35E] hover:bg-[#FFF7E9]/8 hover:text-[#FFF8EE]"
                              onClick={() =>
                                setSelectedEmployeeId(employee.employee_id)
                              }
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className={cn(
                            "py-10 text-center text-sm",
                            MUTED_TEXT,
                          )}
                        >
                          {canViewEmployees
                            ? "No staff match this filter."
                            : "Your role cannot view employee records."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#C8773E]/18 text-[#E9A35E]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
                    Access
                  </h3>
                  <p className={cn("text-xs", MUTED_TEXT)}>
                    Owners, finance, managers
                  </p>
                </div>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("rounded-[8px]", GLASS_BUTTON)}
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
                  className={cn("rounded-[8px] px-3 py-2", GLASS_SUB_PANEL)}
                >
                  <p className={cn("truncate text-sm font-medium", DARK_TEXT)}>
                    {member.name ?? member.email}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span
                      className={cn(
                        "rounded-[6px] px-2 py-0.5",
                        ROLE_COLORS[member.role] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {ORG_ROLE_LABELS[member.role] ?? member.role}
                    </span>
                    <span className={cn("truncate", MUTED_TEXT)}>
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
              <div className="mt-3 flex items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Mail className="h-3.5 w-3.5" />
                {pendingCount} pending invite{pendingCount === 1 ? "" : "s"}
              </div>
            ) : null}
          </section>

          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#AB6E3C]" />
              <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
                Branch staffing
              </h3>
            </div>
            <div className="mt-3 overflow-hidden rounded-[8px] border border-[rgba(241,220,196,0.14)] bg-[#080705]/22">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn("h-9 text-xs", GLASS_TABLE_HEAD)}>
                      Branch
                    </TableHead>
                    <TableHead
                      className={cn("h-9 text-right text-xs", GLASS_TABLE_HEAD)}
                    >
                      Staff
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow
                      key={branch.id}
                      className="cursor-pointer border-[rgba(241,220,196,0.08)] hover:bg-[#FFF7E9]/6"
                      onClick={() => selectBranch(branch.id)}
                    >
                      <TableCell
                        className={cn("py-2 text-xs font-medium", DARK_TEXT)}
                      >
                        {branch.name}
                      </TableCell>
                      <TableCell
                        className={cn("py-2 text-right text-xs", MUTED_TEXT)}
                      >
                        {employeeCountByBranch.get(branch.id) ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!canViewEmployees ? (
              <div className="mt-3 flex items-start gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your role can manage access, but cannot view employee payroll.
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      {showInvitePanel ? (
        <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
              Manage organization access
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-[8px] text-[#E9A35E] hover:bg-[#FFF7E9]/8 hover:text-[#FFF8EE]"
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

      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
        <DialogContent className={cn("max-w-2xl rounded-[10px]", GLASS_PANEL)}>
          <DialogHeader>
            <DialogTitle className={DARK_TEXT}>Add staff</DialogTitle>
            <DialogDescription className={MUTED_TEXT}>
              Send the branch staff invite.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={MUTED_TEXT}>Name</Label>
              <Input
                className={GLASS_INPUT}
                value={addForm.name}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className={MUTED_TEXT}>Email</Label>
              <Input
                className={GLASS_INPUT}
                type="email"
                value={addForm.email}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className={MUTED_TEXT}>Branch</Label>
              <Select
                value={addForm.restaurant_id}
                onValueChange={(value) =>
                  setAddForm((current) => ({
                    ...current,
                    restaurant_id: value,
                  }))
                }
              >
                <SelectTrigger className={GLASS_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={MUTED_TEXT}>Role</Label>
              <Select
                value={addForm.job_title}
                onValueChange={(value) =>
                  setAddForm((current) => ({
                    ...current,
                    job_title: value as JobTitle,
                  }))
                }
              >
                <SelectTrigger className={GLASS_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                  {Object.entries(JOB_TITLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={GLASS_BUTTON}
              onClick={() => setAddEmployeeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeSalaryOpen} onOpenChange={setCloseSalaryOpen}>
        <DialogContent className={cn("max-w-lg rounded-[10px]", GLASS_PANEL)}>
          <DialogHeader>
            <DialogTitle className={DARK_TEXT}>Close salary</DialogTitle>
            <DialogDescription className={MUTED_TEXT}>
              Approve the selected month and create the branch payroll expense.
            </DialogDescription>
          </DialogHeader>
          {selectedTeamPayroll ? (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between border-b border-[rgba(241,220,196,0.12)] py-2">
                <span className={MUTED_TEXT}>Branch</span>
                <span className={cn("font-medium", DARK_TEXT)}>
                  {selectedBranch?.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-[rgba(241,220,196,0.12)] py-2">
                <span className={MUTED_TEXT}>Month</span>
                <span className={cn("font-medium", DARK_TEXT)}>
                  {selectedTeamPayroll.monthLabel}
                </span>
              </div>
              <div className="flex justify-between border-b border-[rgba(241,220,196,0.12)] py-2">
                <span className={MUTED_TEXT}>Approved hours</span>
                <span className={cn("font-medium tabular-nums", DARK_TEXT)}>
                  {selectedTeamPayroll.totals.approvedHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className={MUTED_TEXT}>Salary expense</span>
                <span className={cn("font-semibold tabular-nums", DARK_TEXT)}>
                  {selectedTeamPayroll.totals.estimatedPayroll != null
                    ? formatMoney(
                        selectedTeamPayroll.totals.estimatedPayroll,
                        payrollCurrency,
                        appLocale,
                      )
                    : "Needs rates"}
                </span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={GLASS_BUTTON}
              onClick={() => setCloseSalaryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
              onClick={handleCloseSalary}
              disabled={!canCloseSalary || closingSalary}
            >
              {closingSalary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Approve and close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployeeId(null);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[90vh] max-w-4xl overflow-y-auto rounded-[10px]",
            GLASS_PANEL,
          )}
        >
          {selectedEmployee ? (
            <>
              <DialogHeader>
                <DialogTitle className={DARK_TEXT}>
                  {selectedEmployee.name}
                </DialogTitle>
                <DialogDescription className={MUTED_TEXT}>
                  {selectedEmployee.restaurant_name} ·{" "}
                  {JOB_TITLE_LABELS[selectedEmployee.job_title as JobTitle] ??
                    selectedEmployee.job_title}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <section className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
                        Protected profile
                      </h3>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("rounded-[8px]", GLASS_BUTTON)}
                          onClick={() =>
                            setEditingProfile((current) => !current)
                          }
                        >
                          {editingProfile ? "View" : "Edit"}
                        </Button>
                      ) : null}
                    </div>
                    {editingProfile ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["name", "Name"],
                          ["gender", "Gender"],
                          ["phone", "Phone"],
                          ["contact_email", "Email"],
                          ["address", "Address"],
                          ["facebook_url", "Facebook"],
                          ["bank_name", "Bank"],
                          ["bank_branch_name", "Bank branch"],
                          ["bank_account_type", "Account type"],
                          ["bank_account_number", "Account number"],
                          ["bank_account_holder", "Account holder"],
                          ["tax_social_number", "Tax number"],
                          ["insurance_number", "Insurance number"],
                        ].map(([key, label]) => (
                          <div key={key} className="space-y-1.5">
                            <Label className={MUTED_TEXT}>{label}</Label>
                            <Input
                              className={GLASS_INPUT}
                              value={
                                profileForm[key as keyof typeof profileForm]
                              }
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                        <div className="space-y-1.5">
                          <Label className={MUTED_TEXT}>Role</Label>
                          <Select
                            value={profileForm.job_title}
                            onValueChange={(value) =>
                              setProfileForm((current) => ({
                                ...current,
                                job_title: value as JobTitle,
                              }))
                            }
                          >
                            <SelectTrigger className={GLASS_INPUT}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
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
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["Email", selectedEmployee.email],
                          ["Gender", selectedEmployee.private_profile?.gender],
                          ["Phone", selectedEmployee.private_profile?.phone],
                          [
                            "Contact email",
                            selectedEmployee.private_profile?.contact_email,
                          ],
                          [
                            "Address",
                            selectedEmployee.private_profile?.address,
                          ],
                          [
                            "Facebook",
                            selectedEmployee.private_profile?.facebook_url,
                          ],
                          ["Bank", selectedEmployee.private_profile?.bank_name],
                          [
                            "Bank branch",
                            selectedEmployee.private_profile?.bank_branch_name,
                          ],
                          [
                            "Account type",
                            selectedEmployee.private_profile?.bank_account_type,
                          ],
                          [
                            "Account number",
                            selectedEmployee.private_profile?.bank_account_holder
                              ? "••••••••"
                              : undefined,
                          ],
                          [
                            "Account holder",
                            selectedEmployee.private_profile
                              ?.bank_account_holder,
                          ],
                          [
                            "Tax number",
                            selectedEmployee.private_profile?.tax_social_number,
                          ],
                          [
                            "Insurance",
                            selectedEmployee.private_profile?.insurance_number,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className={cn(
                              "rounded-[8px] px-3 py-2",
                              GLASS_SUB_PANEL,
                            )}
                          >
                            <p className={cn("text-[11px]", MUTED_TEXT)}>
                              {label}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-sm font-medium",
                                DARK_TEXT,
                              )}
                            >
                              {maskValue(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-3">
                  <section className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}>
                    <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
                      Working hours
                    </h3>
                    {selectedEmployeePayroll && selectedTeamPayroll ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Month</span>
                          <span className={cn("font-medium", DARK_TEXT)}>
                            {selectedTeamPayroll.monthLabel}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Rate</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              DARK_TEXT,
                            )}
                          >
                            {selectedEmployeeRate != null
                              ? formatMoney(
                                  selectedEmployeeRate,
                                  payrollCurrency,
                                  appLocale,
                                )
                              : "Missing"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Scheduled</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              DARK_TEXT,
                            )}
                          >
                            {selectedEmployeePayroll.monthlyScheduledHours.toFixed(
                              1,
                            )}
                            h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Approved</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              DARK_TEXT,
                            )}
                          >
                            {selectedEmployeePayroll.approvedHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Pending</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              DARK_TEXT,
                            )}
                          >
                            {selectedEmployeePayroll.pendingHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={MUTED_TEXT}>Salary</span>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              DARK_TEXT,
                            )}
                          >
                            {selectedEmployeePayroll.estimatedPayroll != null
                              ? formatMoney(
                                  selectedEmployeePayroll.estimatedPayroll,
                                  payrollCurrency,
                                  appLocale,
                                )
                              : "Rate needed"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className={cn("mt-3 text-sm", MUTED_TEXT)}>
                        Select this staff member&apos;s branch to view month
                        hours.
                      </p>
                    )}
                  </section>
                  <section className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}>
                    <h3 className={cn("text-sm font-semibold", DARK_TEXT)}>
                      Rights
                    </h3>
                    <p className={cn("mt-2 text-sm", MUTED_TEXT)}>
                      {selectedEmployee.is_active ? "Active staff" : "Inactive"}
                    </p>
                  </section>
                </aside>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className={GLASS_BUTTON}
                  onClick={() => setSelectedEmployeeId(null)}
                >
                  Close
                </Button>
                {editingProfile ? (
                  <Button
                    type="button"
                    className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
