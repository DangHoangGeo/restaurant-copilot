"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface AttendanceSummary {
  id: string;
  work_date: string;
  first_check_in: string | null;
  last_check_out: string | null;
  total_hours: number | null;
  status: string;
  has_exception: boolean;
  exception_notes: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  correction_pending: { label: "Correction", variant: "secondary" },
};

export function MyAttendanceClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { from, to } = getMonthRange(year, month);
    try {
      const res = await window.fetch(`/api/v1/employee/my-attendance?from=${from}&to=${to}`);
      const data = await res.json();
      setSummaries(data.summaries ?? []);
      setTotalHours(data.total_approved_hours ?? 0);
    } catch {
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setYear((y: number) => y - 1); setMonth(12); }
    else setMonth((m: number) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y: number) => y + 1); setMonth(1); }
    else setMonth((m: number) => m + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Hours</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary card */}
      <Card className="rounded-xl bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center gap-4">
          <Clock className="h-8 w-8 opacity-80" />
          <div>
            <p className="text-sm opacity-80">Approved hours this month</p>
            <p className="text-3xl font-bold">{totalHours.toFixed(1)} h</p>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Clock className="h-10 w-10 opacity-30" />
              <p className="text-sm">No attendance records this month</p>
            </div>
          ) : (
            summaries.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={s.id} className={`rounded-xl ${s.has_exception ? "border-orange-300" : ""}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatDate(s.work_date)}</span>
                      <div className="flex items-center gap-2">
                        {s.has_exception && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>In: <span className="font-medium text-foreground">{formatTime(s.first_check_in)}</span></span>
                        <span>Out: <span className="font-medium text-foreground">{formatTime(s.last_check_out)}</span></span>
                      </div>
                      {s.total_hours != null && (
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          {s.total_hours.toFixed(2)} h
                        </div>
                      )}
                    </div>
                    {s.exception_notes && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">{s.exception_notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
      </div>
    </div>
  );
}
