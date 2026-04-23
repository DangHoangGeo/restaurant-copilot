"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import EmployeeForm, { EmployeeFormEmployee } from './EmployeeForm';
import { EMPLOYEE_JOB_TITLES } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, PlusCircle, QrCode, UserX, Hash } from "lucide-react";
import EmployeeQRPanel from '@/components/features/admin/employees/EmployeeQRPanel';
import EmployeeCheckinCode from '@/components/features/admin/employees/EmployeeCheckinCode';
import { toast } from "sonner";

export interface ApiEmployee {
  id: string;
  role: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
}

export type DisplayEmployee = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  employee_job_title: string;
  user_app_role: string;
};

const JOB_TITLE_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  chef: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  server: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cashier: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function EmployeeList() {
  const t = useTranslations("owner.employees.list");
  const t_form = useTranslations("owner.employees.form");

  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeFormEmployee | null>(null);
  const [qrEmployee, setQrEmployee] = useState<DisplayEmployee | null>(null);
  const [codeEmployee, setCodeEmployee] = useState<DisplayEmployee | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/owner/employees");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch employees: ${response.statusText}`);
      }
      const data = await response.json();
      const transformedEmployees: DisplayEmployee[] = (data.employees || []).map((emp: ApiEmployee) => ({
        id: emp.id,
        user_id: emp.user_id,
        name: emp.users?.name || 'N/A',
        email: emp.users?.email || 'N/A',
        employee_job_title: emp.role,
        user_app_role: emp.users?.role || 'N/A',
      }));
      setEmployees(transformedEmployees);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(t("notifications.fetchError", { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleEditEmployee = (employee: DisplayEmployee) => {
    const formEmployee: EmployeeFormEmployee = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      employee_job_title: employee.employee_job_title as typeof EMPLOYEE_JOB_TITLES[keyof typeof EMPLOYEE_JOB_TITLES],
    };
    setEditingEmployee(formEmployee);
    setShowEmployeeForm(true);
  };

  const handleFormSuccess = () => {
    setShowEmployeeForm(false);
    fetchEmployees();
  };

  const handleDeactivate = async (employee: DisplayEmployee) => {
    if (!confirm(t("notifications.confirmDeactivate", { name: employee.name }))) return;
    setDeactivatingId(employee.id);
    try {
      const response = await fetch(`/api/v1/owner/employees/${employee.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("notifications.deactivateError"));
      toast.success(t("notifications.deactivateSuccess", { name: employee.name }));
      fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.deactivateError"));
    } finally {
      setDeactivatingId(null);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("notifications.errorTitle")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <Button
          onClick={() => { setEditingEmployee(null); setShowEmployeeForm(true); }}
          disabled={isLoading}
          size="sm"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" />
          {t("actions.addEmployee")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
          <p className="text-sm">{t("table.noEmployees")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${JOB_TITLE_COLORS[emp.employee_job_title] ?? "bg-gray-100 text-gray-800"}`}>
                    {emp.employee_job_title.charAt(0).toUpperCase() + emp.employee_job_title.slice(1)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleEditEmployee(emp)} disabled={deactivatingId === emp.id}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCodeEmployee(emp)} disabled={deactivatingId === emp.id}>
                    <Hash className="mr-1 h-3 w-3" />
                    Code
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQrEmployee(emp)} disabled={deactivatingId === emp.id}>
                    <QrCode className="mr-1 h-3 w-3" />
                    QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:border-destructive ml-auto"
                    onClick={() => handleDeactivate(emp)}
                    disabled={deactivatingId === emp.id}
                  >
                    {deactivatingId === emp.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserX className="mr-1 h-3 w-3" />}
                    {t("actions.deactivate")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit employee dialog */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t_form("editTitle") : t_form("addTitle")}</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            onClose={() => setShowEmployeeForm(false)}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Employee checkin code dialog */}
      {codeEmployee && (
        <Dialog open={!!codeEmployee} onOpenChange={(open) => { if (!open) setCodeEmployee(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Checkin Code — {codeEmployee.name}</DialogTitle>
            </DialogHeader>
            <EmployeeCheckinCode employeeId={codeEmployee.id} employeeName={codeEmployee.name} />
          </DialogContent>
        </Dialog>
      )}

      {/* Legacy QR panel */}
      {qrEmployee && (
        <Dialog open={!!qrEmployee} onOpenChange={(open) => { if (!open) setQrEmployee(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{qrEmployee.name}</DialogTitle>
            </DialogHeader>
            <EmployeeQRPanel employeeId={qrEmployee.id} employeeName={qrEmployee.name} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
