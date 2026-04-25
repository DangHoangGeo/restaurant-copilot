import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getLocalDateString } from "@/lib/server/dashboard/dates";
import type { OrgEmployeeRow } from "@/lib/server/organizations/queries";

const JOB_TITLES = ["manager", "chef", "server", "cashier"] as const;
type JobTitle = (typeof JOB_TITLES)[number];

interface ScheduleRow {
  employee_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface AttendanceSummaryRow {
  employee_id: string;
  total_hours: number | null;
  status: "pending" | "approved" | "rejected" | "correction_pending";
  has_exception: boolean;
}

interface RolePayRateRow {
  job_title: JobTitle;
  hourly_rate: number;
  currency: string;
}

export interface BranchRolePayRate {
  jobTitle: JobTitle;
  hourlyRate: number | null;
  currency: string;
}

export interface BranchEmployeeScheduleSlot {
  weekday: number;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface BranchTeamEmployeeSummary {
  employeeId: string;
  userId: string;
  name: string;
  email: string;
  jobTitle: string;
  weeklySchedule: BranchEmployeeScheduleSlot[];
  weeklyScheduledHours: number;
  monthlyScheduledHours: number;
  approvedHours: number;
  pendingHours: number;
  pendingSummaries: number;
  hasException: boolean;
  estimatedPayroll: number | null;
}

export interface BranchTeamPayrollData {
  monthKey: string;
  monthLabel: string;
  rolePayRates: BranchRolePayRate[];
  employees: BranchTeamEmployeeSummary[];
  totals: {
    employeeCount: number;
    weeklyScheduledHours: number;
    approvedHours: number;
    pendingHours: number;
    pendingSummaries: number;
    estimatedPayroll: number | null;
    missingRateRoles: string[];
  };
}

function monthBounds(monthKey: string): { from: string; to: string } {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buildMonthLabel(monthKey: string): string {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function weekdayOccurrencesInMonth(monthKey: string, weekday: number): number {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const jsDay = new Date(year, month - 1, day).getDay();
    const isoWeekday = jsDay === 0 ? 7 : jsDay;
    if (isoWeekday === weekday) {
      count += 1;
    }
  }

  return count;
}

function calculateDurationHours(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const durationMinutes = Math.max(endMinutes - startMinutes, 0);
  return parseFloat((durationMinutes / 60).toFixed(2));
}

export async function getBranchTeamPayrollData(params: {
  branchId: string;
  employees: OrgEmployeeRow[];
  timezone?: string | null;
  currency?: string | null;
  monthKey?: string | null;
}): Promise<BranchTeamPayrollData> {
  const { branchId, employees, timezone, currency } = params;
  const localToday = getLocalDateString(timezone);
  const monthKey = params.monthKey?.match(/^\d{4}-\d{2}$/)
    ? params.monthKey
    : localToday.slice(0, 7);
  const { from, to } = monthBounds(monthKey);

  const [schedulesResult, summariesResult, payRatesResult] = await Promise.all([
    supabaseAdmin
      .from("schedules")
      .select("employee_id, weekday, start_time, end_time")
      .eq("restaurant_id", branchId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true }),
    supabaseAdmin
      .from("attendance_daily_summaries")
      .select("employee_id, total_hours, status, has_exception")
      .eq("restaurant_id", branchId)
      .gte("work_date", from)
      .lte("work_date", to),
    supabaseAdmin
      .from("restaurant_role_pay_rates")
      .select("job_title, hourly_rate, currency")
      .eq("restaurant_id", branchId),
  ]);

  const scheduleRows = ((schedulesResult.data ?? []) as ScheduleRow[]).reduce<
    Map<string, BranchEmployeeScheduleSlot[]>
  >((map, row) => {
    const existing = map.get(row.employee_id) ?? [];
    existing.push({
      weekday: row.weekday,
      startTime: row.start_time,
      endTime: row.end_time,
      hours: calculateDurationHours(row.start_time, row.end_time),
    });
    map.set(row.employee_id, existing);
    return map;
  }, new Map());

  const attendanceRows = (summariesResult.data ?? []) as AttendanceSummaryRow[];
  const attendanceByEmployee = attendanceRows.reduce<
    Map<
      string,
      {
        approvedHours: number;
        pendingHours: number;
        pendingSummaries: number;
        hasException: boolean;
      }
    >
  >((map, row) => {
    const existing = map.get(row.employee_id) ?? {
      approvedHours: 0,
      pendingHours: 0,
      pendingSummaries: 0,
      hasException: false,
    };

    const totalHours = Number(row.total_hours ?? 0);
    if (row.status === "approved") {
      existing.approvedHours += totalHours;
    }
    if (row.status === "pending" || row.status === "correction_pending") {
      existing.pendingHours += totalHours;
      existing.pendingSummaries += 1;
    }
    existing.hasException = existing.hasException || row.has_exception;
    map.set(row.employee_id, existing);
    return map;
  }, new Map());

  const rolePayRatesMap = new Map(
    ((payRatesResult.data ?? []) as RolePayRateRow[]).map((row) => [
      row.job_title,
      {
        jobTitle: row.job_title,
        hourlyRate: Number(row.hourly_rate),
        currency: row.currency,
      },
    ]),
  );

  const rolePayRates: BranchRolePayRate[] = JOB_TITLES.map((jobTitle) => ({
    jobTitle,
    hourlyRate: rolePayRatesMap.get(jobTitle)?.hourlyRate ?? null,
    currency: rolePayRatesMap.get(jobTitle)?.currency ?? currency ?? "JPY",
  }));

  const employeeSummaries = employees.map<BranchTeamEmployeeSummary>(
    (employee) => {
      const weeklySchedule = scheduleRows.get(employee.employee_id) ?? [];
      const weeklyScheduledHours = parseFloat(
        weeklySchedule.reduce((sum, slot) => sum + slot.hours, 0).toFixed(2),
      );
      const monthlyScheduledHours = parseFloat(
        weeklySchedule
          .reduce(
            (sum, slot) =>
              sum +
              slot.hours * weekdayOccurrencesInMonth(monthKey, slot.weekday),
            0,
          )
          .toFixed(2),
      );
      const attendance = attendanceByEmployee.get(employee.employee_id) ?? {
        approvedHours: 0,
        pendingHours: 0,
        pendingSummaries: 0,
        hasException: false,
      };
      const roleRate =
        rolePayRatesMap.get(employee.job_title as JobTitle)?.hourlyRate ?? null;

      return {
        employeeId: employee.employee_id,
        userId: employee.user_id,
        name: employee.name,
        email: employee.email,
        jobTitle: employee.job_title,
        weeklySchedule,
        weeklyScheduledHours,
        monthlyScheduledHours,
        approvedHours: parseFloat(attendance.approvedHours.toFixed(2)),
        pendingHours: parseFloat(attendance.pendingHours.toFixed(2)),
        pendingSummaries: attendance.pendingSummaries,
        hasException: attendance.hasException,
        estimatedPayroll:
          roleRate != null
            ? parseFloat((attendance.approvedHours * roleRate).toFixed(2))
            : null,
      };
    },
  );

  const missingRateRoles = JOB_TITLES.filter(
    (jobTitle) =>
      employeeSummaries.some((employee) => employee.jobTitle === jobTitle) &&
      !rolePayRatesMap.has(jobTitle),
  );
  const estimatedPayrollValues = employeeSummaries
    .map((employee) => employee.estimatedPayroll)
    .filter((value): value is number => value != null);

  return {
    monthKey,
    monthLabel: buildMonthLabel(monthKey),
    rolePayRates,
    employees: employeeSummaries,
    totals: {
      employeeCount: employeeSummaries.length,
      weeklyScheduledHours: parseFloat(
        employeeSummaries
          .reduce((sum, employee) => sum + employee.weeklyScheduledHours, 0)
          .toFixed(2),
      ),
      approvedHours: parseFloat(
        employeeSummaries
          .reduce((sum, employee) => sum + employee.approvedHours, 0)
          .toFixed(2),
      ),
      pendingHours: parseFloat(
        employeeSummaries
          .reduce((sum, employee) => sum + employee.pendingHours, 0)
          .toFixed(2),
      ),
      pendingSummaries: employeeSummaries.reduce(
        (sum, employee) => sum + employee.pendingSummaries,
        0,
      ),
      estimatedPayroll:
        estimatedPayrollValues.length ===
        employeeSummaries.filter((employee) => employee.approvedHours > 0)
          .length
          ? parseFloat(
              estimatedPayrollValues
                .reduce((sum, value) => sum + value, 0)
                .toFixed(2),
            )
          : null,
      missingRateRoles,
    },
  };
}
