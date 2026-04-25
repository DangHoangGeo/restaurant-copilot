"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import type {
  BranchTeamEmployeeSummary,
  BranchTeamPayrollData,
} from "@/lib/server/control/branch-team";

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
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
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
  const router = useRouter();
  const t = useTranslations("owner.control.branchDetail.teamPanel");
  const tDetail = useTranslations("owner.control.branchDetail");
  const payrollCurrency =
    data.rolePayRates.find((rate) => rate.currency)?.currency ?? currency;
  const [editingEmployee, setEditingEmployee] =
    useState<BranchTeamEmployeeSummary | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", jobTitle: "server" });
  const [saving, setSaving] = useState(false);
  const employees = useMemo(
    () =>
      [...data.employees].sort(
        (left, right) =>
          right.pendingSummaries - left.pendingSummaries ||
          right.pendingHours - left.pendingHours ||
          left.name.localeCompare(right.name),
      ),
    [data.employees],
  );

  const openEdit = (employee: BranchTeamEmployeeSummary) => {
    setEditingEmployee(employee);
    setEditDraft({ name: employee.name, jobTitle: employee.jobTitle });
  };

  const saveEdit = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/employees/${editingEmployee.employeeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editDraft.name.trim(),
            job_title: editDraft.jobTitle,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? t("toasts.updateEmployeeError"));
      }
      toast.success(t("toasts.updateEmployeeSuccess"));
      setEditingEmployee(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("toasts.updateEmployeeError"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
      <div className="border-b border-[#F1DCC4]/10 px-4 py-3">
        <p className="text-sm font-semibold">{t("schedule.title")}</p>
        <p className="mt-0.5 text-xs text-[#C9B7A0]">
          {t("schedule.description")}
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#F1DCC4]/10 hover:bg-transparent">
              <TableHead className="min-w-[220px] px-4 py-3 text-[#B89078]">
                {t("schedule.employee")}
              </TableHead>
              <TableHead className="px-4 py-3 text-[#B89078]">
                {t("schedule.role")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#B89078]">
                {t("schedule.approved")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#B89078]">
                {t("schedule.pendingReview")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#B89078]">
                {t("schedule.monthPlan")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#B89078]">
                {t("schedule.salary")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#B89078]">
                {t("schedule.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow
                key={employee.employeeId}
                className="border-[#F1DCC4]/10 hover:bg-[#FFF7E9]/[0.055]"
              >
                <TableCell className="px-4 py-3">
                  <p className="text-sm font-semibold text-[#FFF7E9]">
                    {employee.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#C9B7A0]">
                    {employee.email}
                  </p>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                  {t(`roles.${employee.jobTitle}`)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#B9D79B]">
                  {formatHours(employee.approvedHours)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#F2B36F]">
                  {formatHours(employee.pendingHours)}
                  {employee.pendingSummaries > 0 ? (
                    <span className="ml-2 text-xs text-[#C9B7A0]">
                      {t("schedule.waitingCount", {
                        count: employee.pendingSummaries,
                      })}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm tabular-nums text-[#C9B7A0]">
                  {formatHours(employee.monthlyScheduledHours)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums text-[#FFF7E9]">
                  {employee.estimatedPayroll != null
                    ? formatMoney(
                        employee.estimatedPayroll,
                        payrollCurrency,
                        locale,
                      )
                    : t("schedule.setRate")}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] hover:bg-[#FFF7E9]/12"
                    onClick={() => openEdit(employee)}
                  >
                    {t("schedule.edit")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(editingEmployee)}
        onOpenChange={(open) => {
          if (!open) setEditingEmployee(null);
        }}
      >
        <DialogContent className="rounded-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("schedule.editEmployee")}</DialogTitle>
            <DialogDescription>
              {editingEmployee?.email ?? tDetail("common.notSet")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{tDetail("team.fullName")}</Label>
              <Input
                value={editDraft.name}
                onChange={(event) =>
                  setEditDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tDetail("team.role")}</Label>
              <Select
                value={editDraft.jobTitle}
                onValueChange={(value) =>
                  setEditDraft((current) => ({
                    ...current,
                    jobTitle: value,
                  }))
                }
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["manager", "chef", "server", "cashier"] as const).map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={() => setEditingEmployee(null)}
            >
              {tDetail("team.cancel")}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-lg"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("schedule.saveEmployee")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
