"use client";
// AttendanceSummaryView
//
// Replaces the old AttendanceTable. Shows attendance daily summaries (computed
// from attendance_events) instead of raw attendance_records. Supports
// filtering by employee, month, and status.
//
// Managers can approve/reject summaries inline. Exception rows are highlighted.

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, Clock,
} from "lucide-react";

interface ApiEmployee {
  id: string;
  users?: { name?: string };
}

interface DailySummary {
  id: string;
  employee_id: string;
  work_date: string;
  first_check_in: string | null;
  last_check_out: string | null;
  total_hours: number | null;
  status: "pending" | "approved" | "rejected" | "correction_pending";
  has_exception: boolean;
  exception_notes: string | null;
  employee_name: string | null;
  employee_email: string | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "correction_pending";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function StatusBadge({ status }: { status: DailySummary["status"] }) {
  const t = useTranslations("owner.employees.summaries");
  const map: Record<DailySummary["status"], { label: string; className: string }> = {
    pending: { label: t("status.pending"), className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    approved: { label: t("status.approved"), className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    rejected: { label: t("status.rejected"), className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    correction_pending: { label: t("status.correctionPending"), className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  };
  const { label, className } = map[status];
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${className}`}>{label}</span>;
}

export default function AttendanceSummaryView() {
  const t = useTranslations("owner.employees.summaries");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await fetch("/api/v1/owner/employees");
      if (!res.ok) throw new Error(t("errors.loadEmployeesError"));
      const data = await res.json();
      setEmployees(
        (data.employees ?? []).map((emp: ApiEmployee) => ({
          id: emp.id,
          name: emp.users?.name ?? `Employee ${emp.id.substring(0, 6)}`,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.loadEmployeesError"));
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fetchSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
    const dateFrom = `${year}-${month}-01`;
    const dateTo = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    if (selectedEmployeeId !== "all") params.set("employee_id", selectedEmployeeId);
    if (statusFilter !== "all") params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/v1/owner/attendance/summaries?${params}`);
      if (!res.ok) throw new Error(t("errors.loadSummariesError"));
      const data = await res.json();
      setSummaries(data.summaries ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.loadSummariesError"));
      setSummaries([]);
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [currentMonth, selectedEmployeeId, statusFilter, t]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleApproveReject = async (summaryId: string, action: "approved" | "rejected") => {
    setApprovingId(summaryId);
    try {
      const res = await fetch(`/api/v1/owner/attendance/summaries/${summaryId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("errors.approveError"));
      toast.success(action === "approved" ? t("notifications.approved") : t("notifications.rejected"));
      fetchSummaries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.approveError"));
    } finally {
      setApprovingId(null);
    }
  };

  const monthLabel = currentMonth.toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border rounded-lg">
        <div className="flex-1 min-w-[180px]">
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={isLoadingEmployees}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.allEmployees")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allEmployees")}</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="approved">{t("status.approved")}</SelectItem>
              <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
              <SelectItem value="correction_pending">{t("status.correctionPending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[130px] text-center">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={fetchSummaries} disabled={isLoadingSummaries}>
          {isLoadingSummaries ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.refresh")}
        </Button>
      </div>

      {/* Table */}
      <Table>
        {!isLoadingSummaries && summaries.length === 0 && (
          <TableCaption>{t("noSummaries")}</TableCaption>
        )}
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.employee")}</TableHead>
            <TableHead>{t("table.checkIn")}</TableHead>
            <TableHead>{t("table.checkOut")}</TableHead>
            <TableHead>{t("table.hours")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingSummaries
            ? [...Array(5)].map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : summaries.map((s) => (
                <TableRow
                  key={s.id}
                  className={s.has_exception ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                >
                  <TableCell className="font-mono text-sm">
                    {s.work_date}
                    {s.has_exception && (
                      <span
                        className="inline-block ml-1"
                        title={s.exception_notes ?? undefined}
                        aria-label={s.exception_notes ?? t("exceptionNote")}
                      >
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.employee_name ?? s.employee_id.substring(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm">{formatTime(s.first_check_in)}</TableCell>
                  <TableCell className="text-sm">{formatTime(s.last_check_out)}</TableCell>
                  <TableCell className="text-sm">
                    {s.total_hours != null ? `${s.total_hours.toFixed(2)} h` : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {(s.status === "pending" || s.status === "correction_pending") && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-700 hover:text-green-900 hover:bg-green-50"
                          disabled={approvingId === s.id}
                          onClick={() => handleApproveReject(s.id, "approved")}
                        >
                          {approvingId === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          <span className="ml-1 text-xs">{t("actions.approve")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-700 hover:text-red-900 hover:bg-red-50"
                          disabled={approvingId === s.id}
                          onClick={() => handleApproveReject(s.id, "rejected")}
                        >
                          <XCircle className="h-3 w-3" />
                          <span className="ml-1 text-xs">{t("actions.reject")}</span>
                        </Button>
                      </div>
                    )}
                    {s.status === "approved" && (
                      <span className="flex items-center justify-end gap-1 text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3" /> {t("status.approved")}
                      </span>
                    )}
                    {s.status === "rejected" && (
                      <span className="flex items-center justify-end gap-1 text-red-600 text-xs">
                        <XCircle className="h-3 w-3" /> {t("status.rejected")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      {/* Exception summary */}
      {summaries.some((s) => s.has_exception) && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t("exceptionNote")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
