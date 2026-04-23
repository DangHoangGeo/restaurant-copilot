"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

interface ScheduleEntry {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isToday(date: Date): boolean {
  return toYMD(date) === toYMD(new Date());
}

export function MyScheduleClient() {
  const [monday, setMonday] = useState<Date>(getWeekMonday(new Date()));
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekYear = monday.getFullYear();
  const weekNum = getISOWeek(monday);
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(monday, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/employee/my-schedule?week=${weekYear}-W${String(weekNum).padStart(2, "0")}`);
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch {
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [weekYear, weekNum]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const scheduleMap = Object.fromEntries(schedules.map((s) => [s.work_date, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Schedule</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonday(addDays(monday, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonday(addDays(monday, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {weekDays.map((day, i) => {
          const dateStr = toYMD(day);
          const schedule = scheduleMap[dateStr];
          const today = isToday(day);

          if (isLoading) {
            return <Skeleton key={dateStr} className="h-16 w-full rounded-xl" />;
          }

          return (
            <Card
              key={dateStr}
              className={`rounded-xl border transition-colors ${today ? "border-primary bg-primary/5" : ""} ${!schedule ? "opacity-50" : ""}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-center min-w-[44px] ${today ? "text-primary" : "text-muted-foreground"}`}>
                    <p className="text-xs font-medium uppercase">{DAYS[i]}</p>
                    <p className={`text-lg font-bold leading-none ${today ? "text-primary" : ""}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  {today && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground">
                      Today
                    </span>
                  )}
                </div>

                {schedule ? (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{schedule.start_time}</span>
                    <span className="text-muted-foreground">–</span>
                    <span>{schedule.end_time}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Day off</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && schedules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-sm">No shifts scheduled this week</p>
        </div>
      )}
    </div>
  );
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
