"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, CheckCircle } from "lucide-react";
import {
  formatDateYYYYMMDD,
  formatDateYYYYMM,
  formatTime,
  formatMonthYearForDisplay,
} from "@/lib/dateUtils";

// Types
interface ApiEmployee {
  id: string;
  users?: {
    name?: string;
  };
}

interface ApiEmployeeForAttendance {
  id: string; // employees.id
  name: string;
}

export interface AttendanceRecord {
  id: string; // UUID of the attendance record
  employee_id: string;
  work_date: string; // YYYY-MM-DD
  check_in_time?: string | null; // ISO DateTime string
  check_out_time?: string | null; // ISO DateTime string
  hours_worked?: number | null; // Numeric
  status: 'recorded' | 'checked';
  verified_by?: string | null; // User ID (UUID)
  verified_at?: string | null; // ISO DateTime string
}

// Mock user role - replace with actual role from context/session
const USER_IS_MANAGER_OR_OWNER = true; // const userRole = 'owner';

export default function AttendanceTable() {
  const t = useTranslations("owner.employees.attendance");
  const common_t = useTranslations("common");

  const [employees, setEmployees] = useState<ApiEmployeeForAttendance[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1); // First day of current month
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isVerifyingRecordId, setIsVerifyingRecordId] = useState<string | null>(null);

  const [errorEmployees, setErrorEmployees] = useState<string | null>(null);
  const [errorRecords, setErrorRecords] = useState<string | null>(null);

  // Fetch employees
  useEffect(() => {
    const fetchEmployeesList = async () => {
      setIsLoadingEmployees(true);
      setErrorEmployees(null);
      try {
        const response = await fetch("/api/v1/owner/employees");
        if (!response.ok) throw new Error(t("errors.loadEmployeesError"));
        const data = await response.json();
        const fetchedEmployees = (data.employees || []).map((emp: ApiEmployee) => ({
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

  // Fetch attendance records
  const fetchAttendanceData = useCallback(async () => {
    if (!selectedEmployeeId) {
      setAttendanceRecords([]);
      return;
    }
    setIsLoadingRecords(true);
    setErrorRecords(null);
    const monthString = formatDateYYYYMM(currentMonth);
    try {
      const response = await fetch(`/api/v1/owner/employees/${selectedEmployeeId}/attendance?month=${monthString}`);
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("errors.loadRecordsError"));
      }
      const data: AttendanceRecord[] = await response.json();
      setAttendanceRecords(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorRecords(msg);
      toast.error(msg);
      setAttendanceRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [selectedEmployeeId, currentMonth, t]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const handleEmployeeChange = (newEmployeeId: string) => {
    setSelectedEmployeeId(newEmployeeId);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'prev' ? -1 : 1), 1);
      return newMonth;
    });
  };

  const handleVerify = async (recordId: string) => {
    if (!USER_IS_MANAGER_OR_OWNER) {
      toast.error(common_t("errors.unauthorized"));
      return;
    }
    setIsVerifyingRecordId(recordId);
    try {
      const response = await fetch(`/api/v1/owner/attendance/${recordId}/verify`, { method: 'PATCH' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("errors.verifyError"));
      }
      // const updatedRecord: AttendanceRecord = await response.json();
      toast.success(t("notifications.verifySuccess"));
      fetchAttendanceData(); // Re-fetch to update the list
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsVerifyingRecordId(null);
    }
  };

  const monthYearDisplay = formatMonthYearForDisplay(currentMonth, 'en');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card border rounded-lg">
        <div className="w-full sm:w-auto sm:min-w-[250px]">
          <Select onValueChange={handleEmployeeChange} value={selectedEmployeeId} disabled={isLoadingEmployees || isLoadingRecords}>
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
            onClick={() => handleMonthChange('prev')}
            disabled={isLoadingRecords}
            aria-label={t("prevMonthBtn")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-center min-w-[150px]">{monthYearDisplay}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleMonthChange('next')}
            disabled={isLoadingRecords}
            aria-label={t("nextMonthBtn")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {errorRecords && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{t("errors.errorTitle")}</AlertTitle><AlertDescription>{errorRecords}</AlertDescription></Alert>
      )}

      <Table>
        {!selectedEmployeeId && !isLoadingEmployees && !errorEmployees && (
             <TableCaption>{t("promptSelectEmployee")}</TableCaption>
        )}
        {selectedEmployeeId && isLoadingRecords && (
            <TableCaption>{common_t("status.loadingRecords")}</TableCaption>
        )}
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.checkIn")}</TableHead>
            <TableHead>{t("table.checkOut")}</TableHead>
            <TableHead>{t("table.hoursWorked")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            {USER_IS_MANAGER_OR_OWNER && <TableHead className="text-right">{t("table.actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingRecords ? (
            [...Array(5)].map((_, i) => (
              <TableRow key={`skel-${i}`}>
                <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"/></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"/></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"/></TableCell>
                <TableCell><div className="h-5 w-16 bg-muted rounded animate-pulse"/></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"/></TableCell>
                {USER_IS_MANAGER_OR_OWNER && <TableCell className="text-right"><div className="h-8 w-20 bg-muted rounded animate-pulse float-right"/></TableCell>}
              </TableRow>
            ))
          ) : attendanceRecords.length > 0 ? (
            attendanceRecords.map(record => (
              <TableRow key={record.id}>
                <TableCell>{formatDateYYYYMMDD(new Date(record.work_date))}</TableCell>
                <TableCell>{formatTime(record.check_in_time)}</TableCell>
                <TableCell>{formatTime(record.check_out_time)}</TableCell>
                <TableCell>{record.hours_worked?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${record.status === 'checked' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                    {record.status === 'checked' ? t("status.verified") : t("status.recorded")}
                  </span>
                </TableCell>
                {USER_IS_MANAGER_OR_OWNER && (
                  <TableCell className="text-right">
                    {record.status === 'recorded' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(record.id)}
                        disabled={isVerifyingRecordId === record.id}
                      >
                        {isVerifyingRecordId === record.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isVerifyingRecordId === record.id ? t("actions.verifying") : t("actions.verify")}
                      </Button>
                    )}
                    {record.status === 'checked' && (
                        <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            selectedEmployeeId && !isLoadingRecords && !errorRecords && (
              <TableRow>
                <TableCell colSpan={USER_IS_MANAGER_OR_OWNER ? 6 : 5} className="text-center h-24">
                  {t("noRecordsFound")}
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}
