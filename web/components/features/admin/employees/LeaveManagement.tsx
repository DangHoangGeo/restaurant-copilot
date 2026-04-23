"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Umbrella, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string | null;
  employee_email: string | null;
  leave_date: string;
  leave_type: string;
  reason: string | null;
  status: string;
  created_at: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  day_off: "Day Off",
  sick: "Sick Leave",
  vacation: "Vacation",
  personal: "Personal",
};

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

type StatusFilter = typeof STATUS_TABS[number]["value"];

export default function LeaveManagement() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/owner/leave-requests?status=${statusFilter}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: "approved" | "rejected") => {
    setActingId(requestId);
    try {
      const res = await fetch(`/api/v1/owner/leave-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to process request");
      toast.success(action === "approved" ? "Leave request approved" : "Leave request rejected");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Days Off Requests</h2>
        <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-gray-200 text-muted-foreground hover:border-gray-300 dark:border-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
          <Umbrella className="h-10 w-10 opacity-30" />
          <p className="text-sm">No {statusFilter} leave requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="rounded-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">
                      {r.employee_name ?? r.employee_email ?? "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.leave_date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {r.reason && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    &ldquo;{r.reason}&rdquo;
                  </p>
                )}

                {statusFilter === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950"
                      disabled={actingId === r.id}
                      onClick={() => handleAction(r.id, "approved")}
                    >
                      {actingId === r.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                      disabled={actingId === r.id}
                      onClick={() => handleAction(r.id, "rejected")}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
