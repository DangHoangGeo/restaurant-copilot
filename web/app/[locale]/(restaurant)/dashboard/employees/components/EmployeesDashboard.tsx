"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import EmployeeList from './EmployeeList';
import ScheduleWeek from './ScheduleWeek';
import AttendanceTable from './AttendanceTable';
import QRScannerModal from './QRScannerModal';
import PerformanceOverview from './PerformanceOverview';
import AttendanceSummaryView from '@/components/features/admin/employees/AttendanceSummaryView';
import AttendanceApprovalInbox from '@/components/features/admin/employees/AttendanceApprovalInbox';
import { QrCode } from "lucide-react";
import { toast } from "sonner";

// Scan type toggled by the manager before scanning — explicit intent prevents
// the old ambiguity where a missing check_out time determined the scan meaning.
type ScanIntent = "check_in" | "check_out";

export default function EmployeesDashboard() {
  const t = useTranslations("owner.employees.dashboard");
  const t_qr = useTranslations("owner.employees.qrScannerModal");

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [scanIntent, setScanIntent] = useState<ScanIntent>("check_in");

  const handleScanSuccess = async (qrData: string) => {
    // qrData is now the secure credential token from the QR code image,
    // not the employee_id. The scan_type is set explicitly by the manager
    // before opening the scanner.
    try {
      const response = await fetch('/api/v1/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_token: qrData,
          scan_type: scanIntent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || t_qr("notifications.scanApiError"));
      }

      toast.success(result.message || t_qr("notifications.scanSuccess"));

      if (result.summary?.has_exception) {
        toast.warning(t("scanExceptionWarning"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsQrModalOpen(false);
    }
  };

  const openScanner = (intent: ScanIntent) => {
    setScanIntent(intent);
    setIsQrModalOpen(true);
  };

  return (
    <>
      {/* Scan action bar */}
      <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => openScanner("check_in")}>
          <QrCode className="mr-2 h-4 w-4" />
          {t("actions.scanCheckIn")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => openScanner("check_out")}>
          <QrCode className="mr-2 h-4 w-4" />
          {t("actions.scanCheckOut")}
        </Button>
      </div>

      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="approvals">{t("tabs.approvals")}</TabsTrigger>
          <TabsTrigger value="summaries">{t("tabs.summaries")}</TabsTrigger>
          <TabsTrigger value="employees">{t("tabs.employees")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("tabs.schedule")}</TabsTrigger>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
        </TabsList>

        {/* Approvals inbox — the primary daily manager view */}
        <TabsContent value="approvals" className="p-0">
          <AttendanceApprovalInbox />
        </TabsContent>

        {/* Full summaries view with filtering */}
        <TabsContent value="summaries" className="p-0">
          <AttendanceSummaryView />
        </TabsContent>

        <TabsContent value="employees" className="p-0">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="schedule" className="p-0">
          <ScheduleWeek />
        </TabsContent>

        <TabsContent value="performance" className="p-0">
          <PerformanceOverview />
        </TabsContent>
      </Tabs>

      <QRScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}
