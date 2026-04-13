"use client";
// AttendanceApprovalInbox
//
// Shows all pending and correction_pending attendance summaries for the branch.
// Designed for the manager's daily review workflow: see who needs approval,
// approve or reject inline, monitor exception flags.
//
// This is the "what needs attention now" view — it only shows actionable items.

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, Clock, RefreshCw, InboxIcon,
} from "lucide-react";

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

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

export default function AttendanceApprovalInbox() {
  const t = useTranslations("owner.employees.approvalInbox");
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load last 14 days of pending and correction_pending summaries
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 14);
      const dateTo = today.toLocaleDateString("en-CA");
      const dateFrom = fromDate.toLocaleDateString("en-CA");

      const [pendingRes, correctionRes] = await Promise.all([
        fetch(`/api/v1/owner/attendance/summaries?status=pending&date_from=${dateFrom}&date_to=${dateTo}`),
        fetch(`/api/v1/owner/attendance/summaries?status=correction_pending&date_from=${dateFrom}&date_to=${dateTo}`),
      ]);

      const [pendingData, correctionData] = await Promise.all([
        pendingRes.json(),
        correctionRes.json(),
      ]);

      const all = [
        ...(pendingData.summaries ?? []),
        ...(correctionData.summaries ?? []),
      ];

      // Sort by work_date descending, then employee name
      all.sort((a: DailySummary, b: DailySummary) => {
        if (b.work_date !== a.work_date) return b.work_date.localeCompare(a.work_date);
        return (a.employee_name ?? "").localeCompare(b.employee_name ?? "");
      });

      setSummaries(all);
    } catch {
      toast.error(t("errors.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (summaryId: string, action: "approved" | "rejected") => {
    setApprovingId(summaryId);
    try {
      const res = await fetch(`/api/v1/owner/attendance/summaries/${summaryId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("errors.actionError"));
      toast.success(action === "approved" ? t("notifications.approved") : t("notifications.rejected"));
      // Remove from list immediately for instant feedback
      setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.actionError"));
    } finally {
      setApprovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <InboxIcon className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">{t("empty")}</p>
        <Button variant="ghost" size="sm" onClick={fetchPending}>
          <RefreshCw className="mr-2 h-3 w-3" /> {t("actions.refresh")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("pendingCount", { count: summaries.length })}
        </p>
        <Button variant="ghost" size="sm" onClick={fetchPending}>
          <RefreshCw className="mr-2 h-3 w-3" /> {t("actions.refresh")}
        </Button>
      </div>

      <div className="space-y-3">
        {summaries.map((s) => (
          <Card key={s.id} className={s.has_exception ? "border-orange-300 dark:border-orange-700" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: employee + date */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {s.employee_name ?? s.employee_id.substring(0, 8)}
                    </span>
                    {s.status === "correction_pending" && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {t("correctionLabel")}
                      </span>
                    )}
                    {s.has_exception && (
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{s.work_date}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("hours", { checkin: formatTime(s.first_check_in), checkout: formatTime(s.last_check_out) })}
                    {s.total_hours != null && (
                      <span className="ml-2 font-medium">{s.total_hours.toFixed(2)} h</span>
                    )}
                  </p>
                  {s.exception_notes && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">{s.exception_notes}</p>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950"
                    disabled={approvingId === s.id}
                    onClick={() => handleAction(s.id, "approved")}
                  >
                    {approvingId === s.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {t("actions.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                    disabled={approvingId === s.id}
                    onClick={() => handleAction(s.id, "rejected")}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    {t("actions.reject")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {summaries.some((s) => s.has_exception) && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">{t("exceptionNote")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
