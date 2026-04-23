"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeList from './EmployeeList';
import ScheduleWeek from './ScheduleWeek';
import AttendanceSummaryView from '@/components/features/admin/employees/AttendanceSummaryView';
import AttendanceApprovalInbox from '@/components/features/admin/employees/AttendanceApprovalInbox';
import LeaveManagement from '@/components/features/admin/employees/LeaveManagement';
import RestaurantQRManager from '@/components/features/admin/employees/RestaurantQRManager';
import PayrollDashboard from '@/components/features/admin/employees/PayrollDashboard';
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Umbrella,
  QrCode,
  Banknote,
} from "lucide-react";

type Tab = "approvals" | "employees" | "schedule" | "leave" | "payroll" | "restaurant-qr" | "summaries";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "approvals", label: "Approvals", icon: ClipboardCheck },
  { value: "employees", label: "People", icon: Users },
  { value: "schedule", label: "Schedule", icon: CalendarDays },
  { value: "leave", label: "Days Off", icon: Umbrella },
  { value: "payroll", label: "Payroll", icon: Banknote },
  { value: "restaurant-qr", label: "QR Code", icon: QrCode },
  { value: "summaries", label: "Attendance", icon: Clock },
];

export default function EmployeesDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("approvals");

  return (
    <div className="space-y-4">
      {/* Mobile-optimized tab strip */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 bg-muted/60 rounded-xl">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex-1 min-w-[72px] flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900"
            >
              <Icon className="h-4 w-4" />
              <span className="leading-tight">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="approvals" className="mt-4 p-0">
          <AttendanceApprovalInbox />
        </TabsContent>

        <TabsContent value="employees" className="mt-4 p-0">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 p-0">
          <ScheduleWeek />
        </TabsContent>

        <TabsContent value="leave" className="mt-4 p-0">
          <LeaveManagement />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4 p-0">
          <PayrollDashboard />
        </TabsContent>

        <TabsContent value="restaurant-qr" className="mt-4 p-0">
          <RestaurantQRManager />
        </TabsContent>

        <TabsContent value="summaries" className="mt-4 p-0">
          <AttendanceSummaryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
