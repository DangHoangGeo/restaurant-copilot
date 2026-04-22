"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Umbrella, Plus, X } from "lucide-react";

interface LeaveRequest {
  id: string;
  leave_date: string;
  leave_type: string;
  reason: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  day_off: "Day Off",
  sick: "Sick Leave",
  vacation: "Vacation",
  personal: "Personal",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export function MyLeaveClient() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_date: "", leave_type: "day_off", reason: "" });

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/employee/my-leave");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leave_date) {
      toast.error("Please select a date");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/employee/my-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_date: form.leave_date,
          leave_type: form.leave_type,
          reason: form.reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit request");
      toast.success("Leave request submitted");
      setShowForm(false);
      setForm({ leave_date: "", leave_type: "day_off", reason: "" });
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Days Off</h1>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-1.5" />
          Request
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-xl border-primary/30 bg-primary/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">New Request</CardTitle>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="leave_date">Date</Label>
                <Input
                  id="leave_date"
                  type="date"
                  value={form.leave_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm((f) => ({ ...f, leave_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm((f) => ({ ...f, leave_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  placeholder="Brief reason..."
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Umbrella className="h-10 w-10 opacity-30" />
              <p className="text-sm">No leave requests yet</p>
            </div>
          ) : (
            requests.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={r.id} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {new Date(r.leave_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-xs text-muted-foreground">{LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type}</span>
                        </div>
                        {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                        {r.review_note && r.status === "rejected" && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Note: {r.review_note}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
      </div>
    </div>
  );
}
