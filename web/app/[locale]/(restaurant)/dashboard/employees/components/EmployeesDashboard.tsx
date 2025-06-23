"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import EmployeeList from './EmployeeList';
import ScheduleWeek from './ScheduleWeek';
import AttendanceTable from './AttendanceTable';
import QRScannerModal from './QRScannerModal';
import PerformanceOverview from './PerformanceOverview'; // Import the new component
import { QrCode } from "lucide-react";
import { toast } from "sonner";


export default function EmployeesDashboard() {
  const t = useTranslations("owner.employees.dashboard");
  const t_qr = useTranslations("owner.employees.qrScannerModal"); // For scan button & results

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleScanSuccess = async (qrData: string) => {
    // Assuming qrData is the employee_id from the QR code
    try {
      const response = await fetch('/api/v1/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend expects employee_id (from QR) and qrToken (also from QR for this setup)
        // It also uses the logged-in user's session to verify they are this employee.
        body: JSON.stringify({ employee_id: qrData, qrToken: qrData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || t_qr("notifications.scanApiError"));
      }
      // API returns { message: string, record: AttendanceRecord }
      toast.success(result.message || t_qr("notifications.scanSuccess"));
      // TODO: Optionally, could trigger a refresh of an attendance list if one is visible
      // For now, just closing the modal.
    } catch (error) {
      console.error("Scan API call failed:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsQrModalOpen(false); // Close modal on success or error
    }
  };


  return (
    <>
      <div className="flex justify-between items-center mb-4">
        {/* Placeholder for a potential global action area if tabs are not the primary focus */}
        {/* For now, scan button is placed somewhat arbitrarily */}
        <div> {/* Empty div to push button to the right if no other actions */} </div>
        <Button onClick={() => setIsQrModalOpen(true)}>
          <QrCode className="mr-2 h-4 w-4" />
          {t("actions.openQrScanner")}
        </Button>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">{t("tabs.employees")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("tabs.schedule")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="p-0">
          <EmployeeList />
        </TabsContent>
      <TabsContent value="schedule" className="p-0">
        <ScheduleWeek />
      </TabsContent>
      <TabsContent value="attendance" className="p-0">
        <AttendanceTable />
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
