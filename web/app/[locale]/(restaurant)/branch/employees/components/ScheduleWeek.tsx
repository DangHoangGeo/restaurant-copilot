"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  getMonday,
  addDays,
  getDaysOfWeek,
  formatDateYYYYMMDD,
  formatDateYYYYWww,
  formatDateForDisplay,
  formatWeekRangeForDisplay
} from "@/lib/dateUtils"; // Assuming dateUtils.ts is in web/lib

// Types
interface ApiEmployeeForSchedule { // Simplified for this component's needs
  id: string; // employees.id
  name: string;
  // users: { name: string; } | null; // If name is nested in your actual full ApiEmployee type
}

export interface ScheduleEntry {
  id?: string; // UUID from DB, present for existing schedules
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

export default function ScheduleWeek() {
  const t = useTranslations("owner.employees.schedule");
  const common_t = useTranslations("common");

  const [employees, setEmployees] = useState<ApiEmployeeForSchedule[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentMonday, setCurrentMonday] = useState<Date>(getMonday(new Date()));

  const [weekSchedule, setWeekSchedule] = useState<Record<string, ScheduleEntry>>({});
  const [originalWeekSchedule, setOriginalWeekSchedule] = useState<Record<string, ScheduleEntry>>({});

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [errorEmployees, setErrorEmployees] = useState<string | null>(null);
  const [errorSchedules, setErrorSchedules] = useState<string | null>(null);

  // Fetch employees for the selector
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      setErrorEmployees(null);
      try {
        const response = await fetch("/api/v1/owner/employees");
        if (!response.ok) throw new Error(t("errors.loadEmployeesError"));
        const data = await response.json();
        // Assuming data.employees is an array of objects like { id, users: { name } }
        const fetchedEmployees = data.employees.map((emp: { id: string; users?: { name?: string } }) => ({
          id: emp.id,
          name: emp.users?.name || `Employee ${emp.id.substring(0,6)}`,
        }));
        setEmployees(fetchedEmployees);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorEmployees(msg);
        toast.error(msg);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [t]);

  // Fetch schedules when selectedEmployeeId or currentMonday changes
  const fetchSchedules = useCallback(async () => {
    if (!selectedEmployeeId) {
      setWeekSchedule({});
      setOriginalWeekSchedule({});
      return;
    }
    setIsLoadingSchedules(true);
    setErrorSchedules(null);
    const weekString = formatDateYYYYWww(currentMonday);
    try {
      const response = await fetch(`/api/v1/owner/employees/${selectedEmployeeId}/schedules?week=${weekString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("errors.loadSchedulesError"));
      }
      const data: ScheduleEntry[] = await response.json();
      const scheduleMap: Record<string, ScheduleEntry> = {};
      data.forEach(entry => {
        scheduleMap[entry.work_date] = entry;
      });
      setWeekSchedule({...scheduleMap}); // Create new object references
      setOriginalWeekSchedule({...scheduleMap});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorSchedules(msg);
      toast.error(msg);
      setWeekSchedule({});
      setOriginalWeekSchedule({});
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [selectedEmployeeId, currentMonday, t]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleEmployeeChange = (newEmployeeId: string) => {
    setSelectedEmployeeId(newEmployeeId);
    // Fetch schedules will be triggered by the useEffect watching selectedEmployeeId
  };

  const handleTimeInputChange = (dateStr: string, field: 'start_time' | 'end_time', value: string) => {
    setWeekSchedule(prev => {
      const existingEntry = prev[dateStr] || {};
      const updatedEntry = {
        ...existingEntry,
        id: existingEntry.id, // Preserve ID
        work_date: dateStr,   // Ensure work_date is set
        [field]: value,
      };
       // If both start and end times are empty, and it's not an original schedule, effectively remove it from map
      if (!updatedEntry.start_time && !updatedEntry.end_time && !originalWeekSchedule[dateStr]?.id) {
        const newState = { ...prev };
        delete newState[dateStr];
        return newState;
      }
      return { ...prev, [dateStr]: updatedEntry };
    });
  };

  const handleSaveWeek = async () => {
    if (!selectedEmployeeId || isSaving) return;
    setIsSaving(true);

    const toCreate: ScheduleEntry[] = [];
    const toUpdate: ScheduleEntry[] = [];
    const toDelete: string[] = [];
    const daysInView = getDaysOfWeek(currentMonday);

    for (const dayDate of daysInView) {
      const dateStr = formatDateYYYYMMDD(dayDate);
      const current = weekSchedule[dateStr];
      const original = originalWeekSchedule[dateStr];

      const hasCurrentTimes = current?.start_time && current?.end_time;
      const hasOriginalTimes = original?.start_time && original?.end_time;
      const timesChanged = current?.start_time !== original?.start_time || current?.end_time !== original?.end_time;

      if (original?.id) { // Existing schedule
        if (hasCurrentTimes && timesChanged) {
          toUpdate.push({ id: original.id, work_date: dateStr, start_time: current.start_time, end_time: current.end_time });
        } else if (!hasCurrentTimes && hasOriginalTimes) { // Times were cleared
          toDelete.push(original.id);
        }
      } else if (hasCurrentTimes) { // New entry
          toCreate.push({ work_date: dateStr, start_time: current.start_time, end_time: current.end_time });
      }
    }

    try {
      const promises = [];
      if (toCreate.length > 0) {
        promises.push(
          fetch(`/api/v1/owner/employees/${selectedEmployeeId}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toCreate),
          }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
        );
      }
      toUpdate.forEach(entry => {
        promises.push(
          fetch(`/api/v1/owner/employees/${selectedEmployeeId}/schedules/${entry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_date: entry.work_date, start_time: entry.start_time, end_time: entry.end_time }),
          }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
        );
      });
      toDelete.forEach(id => {
        promises.push(
          fetch(`/api/v1/owner/employees/${selectedEmployeeId}/schedules/${id}`, {
            method: 'DELETE',
          }).then(res => res.ok || res.status === 204 ? {} : res.json().then(err => Promise.reject(err)))
        );
      });

      const results = await Promise.allSettled(promises);

      let successCount = 0;
      results.forEach(result => {
        if (result.status === 'fulfilled') successCount++;
        else console.error("Schedule save operation failed:", result.reason);
      });

      if (successCount === promises.length) {
        toast.success(t("notifications.saveSuccess"));
      } else if (successCount > 0) {
        toast.warning(t("notifications.savePartial", { success: successCount, total: promises.length }));
      } else if (promises.length > 0) {
        toast.error(t("notifications.saveErrorAll"));
      } else {
        toast.info(t("notifications.noChanges")); // No operations were attempted
      }

    } catch (err) { // Should be caught by Promise.allSettled reasons mostly
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("notifications.saveErrorGeneral", { error: msg }));
    } finally {
      setIsSaving(false);
      fetchSchedules(); // Re-fetch to get latest state including IDs for created items
    }
  };

  const daysToDisplay = getDaysOfWeek(currentMonday);
  const weekRangeStr = formatWeekRangeForDisplay(daysToDisplay[0], daysToDisplay[6], 'en');


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card border rounded-lg">
        <div className="w-full sm:w-auto sm:min-w-[250px]">
          <Select onValueChange={handleEmployeeChange} value={selectedEmployeeId} disabled={isLoadingEmployees || isSaving}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingEmployees ? common_t("status.loading") : t("selectEmployeePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorEmployees && <Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4"/><AlertDescription>{errorEmployees}</AlertDescription></Alert>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
            disabled={isSaving || isLoadingSchedules}
            aria-label={t('prevWeekBtn')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-center min-w-[200px]">{weekRangeStr}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
            disabled={isSaving || isLoadingSchedules}
            aria-label={t('nextWeekBtn')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedEmployeeId ? (
        <>
          {isLoadingSchedules && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => ( <div key={i} className="p-2 border rounded-md bg-card space-y-2"><div className="h-5 w-16 bg-muted rounded"/><div className="h-8 w-full bg-muted rounded"/><div className="h-8 w-full bg-muted rounded"/></div> ))}
            </div>
          )}
          {!isLoadingSchedules && errorSchedules && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{t("errors.errorTitle")}</AlertTitle><AlertDescription>{errorSchedules}</AlertDescription></Alert>
          )}
          {!isLoadingSchedules && !errorSchedules && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-x-2 gap-y-4">
              {daysToDisplay.map(day => {
                const dateStr = formatDateYYYYMMDD(day);
                const scheduleForDay = weekSchedule[dateStr] || {};
                return (
                  <div key={dateStr} className="p-3 border rounded-lg bg-card shadow">
                    <p className="font-semibold text-sm mb-2 text-center">{formatDateForDisplay(day, 'en')}</p>
                    <div className="space-y-2">
                      <Input
                        type="time"
                        aria-label={`Start time for ${dateStr}`}
                        value={scheduleForDay.start_time || ""}
                        onChange={e => handleTimeInputChange(dateStr, 'start_time', e.target.value)}
                        disabled={isSaving}
                      />
                      <Input
                        type="time"
                        aria-label={`End time for ${dateStr}`}
                        value={scheduleForDay.end_time || ""}
                        onChange={e => handleTimeInputChange(dateStr, 'end_time', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveWeek} disabled={isSaving || isLoadingSchedules || isLoadingEmployees}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </div>
        </>
      ) : (
        !isLoadingEmployees && !errorEmployees && <p className="text-muted-foreground text-center py-8">{t("promptSelectEmployee")}</p>
      )}
    </div>
  );
}
