"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BarChart3, CalendarDays, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMonday,
  addDays,
  formatDateYYYYMMDD,
  formatDateYYYYMM,
} from "@/lib/dateUtils";

// Types
interface ApiEmployeeForPerformance {
  id: string; // employees.id
  name: string;
}

interface AttendanceRecordForPerformance {
  work_date: string; // YYYY-MM-DD
  hours_worked?: number | null;
}

interface PerformanceData {
  totalHoursWeek: number;
  totalHoursMonth: number;
}

const today = new Date();
const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
const currentWeekMonday = getMonday(today);

export default function PerformanceOverview() {
  const t = useTranslations("owner.employees.performance");
  const common_t = useTranslations("common");

  const [employees, setEmployees] = useState<ApiEmployeeForPerformance[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

  const [errorEmployees, setErrorEmployees] = useState<string | null>(null);
  const [errorPerformance, setErrorPerformance] = useState<string | null>(null);

  // Fetch employees
  useEffect(() => {
    const fetchEmployeesList = async () => {
      setIsLoadingEmployees(true);
      setErrorEmployees(null);
      try {
        const response = await fetch("/api/v1/owner/employees");
        if (!response.ok) throw new Error(t("errors.loadEmployeesError"));
        const data = await response.json();
        const fetchedEmployees = (data.employees || []).map((emp: any) => ({
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
    fetchEmployeesList();
  }, [t]);

  // Fetch performance data (attendance for the current month)
  const fetchPerformanceMetrics = useCallback(async () => {
    if (!selectedEmployeeId) {
      setPerformanceData(null);
      return;
    }
    setIsLoadingPerformance(true);
    setErrorPerformance(null);

    // Fetch records for the current calendar month
    const monthStringApi = formatDateYYYYMM(currentMonthDate); // e.g., 2023-11 for November

    try {
      const response = await fetch(`/api/v1/owner/employees/${selectedEmployeeId}/attendance?month=${monthStringApi}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("errors.loadPerformanceError"));
      }
      const records: AttendanceRecordForPerformance[] = await response.json();

      // Calculate total hours for the current month
      const totalMonth = records.reduce((sum, record) => sum + (record.hours_worked || 0), 0);

      // Calculate total hours for the current week
      const weekStartStr = formatDateYYYYMMDD(currentWeekMonday);
      const weekEndStr = formatDateYYYYMMDD(addDays(currentWeekMonday, 6));

      const totalWeek = records
        .filter(r => r.work_date >= weekStartStr && r.work_date <= weekEndStr)
        .reduce((sum, record) => sum + (record.hours_worked || 0), 0);

      setPerformanceData({
        totalHoursMonth: parseFloat(totalMonth.toFixed(2)),
        totalHoursWeek: parseFloat(totalWeek.toFixed(2)),
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorPerformance(msg);
      toast.error(msg);
      setPerformanceData(null);
    } finally {
      setIsLoadingPerformance(false);
    }
  }, [selectedEmployeeId, t]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPerformanceMetrics();
    } else {
      setPerformanceData(null); // Clear data if no employee selected
    }
  }, [selectedEmployeeId, fetchPerformanceMetrics]);


  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="w-full sm:max-w-xs">
          <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isLoadingEmployees || isLoadingPerformance}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingEmployees ? common_t("status.loading") : t("selectEmployeePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorEmployees && <Alert variant="destructive" className="mt-2 text-xs"><AlertTriangle className="h-3 w-3 mr-1 inline-block"/><AlertDescription>{errorEmployees}</AlertDescription></Alert>}
        </div>
      </Card>

      {!selectedEmployeeId && !isLoadingEmployees && !errorEmployees && (
        <p className="text-muted-foreground text-center py-8">{t("promptSelectEmployee")}</p>
      )}

      {selectedEmployeeId && (
        isLoadingPerformance ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalHoursWeekLabel")}</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-24" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalHoursMonthLabel")}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-24" /></CardContent>
            </Card>
          </div>
        ) : errorPerformance ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("errors.errorTitle")}</AlertTitle>
            <AlertDescription>{errorPerformance}</AlertDescription>
          </Alert>
        ) : performanceData ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalHoursWeekLabel")}</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.totalHoursWeek} {t("hoursUnit")}</div>
                <p className="text-xs text-muted-foreground">{t("currentWeekPeriod")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalHoursMonthLabel")}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.totalHoursMonth} {t("hoursUnit")}</div>
                 <p className="text-xs text-muted-foreground">{t("currentMonthPeriod")}</p>
              </CardContent>
            </Card>
            {/* Placeholder for future metrics like Lateness or Streak */}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">{t("noData")}</p>
        )
      )}
    </div>
  );
}
