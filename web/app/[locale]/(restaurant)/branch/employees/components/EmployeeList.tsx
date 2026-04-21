"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import EmployeeForm, { EmployeeFormEmployee } from './EmployeeForm';
import { EMPLOYEE_JOB_TITLES } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, PlusCircle, QrCode, UserX } from "lucide-react";
import EmployeeQRPanel from '@/components/features/admin/employees/EmployeeQRPanel';
import { toast } from "sonner";

// Type matching the GET /api/v1/owner/employees response structure
// The API returns employees with a nested 'users' object.
// The 'role' in the main object is employee_job_title.
// The 'users.role' is the app-level role (e.g., 'employee').
export interface ApiEmployee {
  id: string; // employees.id
  role: string; // This is the employee_job_title (e.g., "chef", "manager")
  user_id: string; // users.id
  users: {
    id: string;
    email: string;
    name: string;
    role: string; // This is users.role (e.g., "owner", "employee")
  } | null; // users can be null if join fails or user not found, though ideally not
  // Add other fields from your actual API response if needed e.g. created_at
}

// Simplified type for display and form interaction
export type DisplayEmployee = {
  id: string; // employees.id
  user_id: string;
  name: string;
  email: string;
  employee_job_title: string; // from employees.role
  user_app_role: string; // from users.role
};


export default function EmployeeList() {
  const t = useTranslations("owner.employees.list");
  const t_form = useTranslations("owner.employees.form"); // For dialog title

  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeFormEmployee | null>(null);
  const [qrEmployee, setQrEmployee] = useState<DisplayEmployee | null>(null);
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

      // Transform API data to DisplayEmployee format
      const transformedEmployees: DisplayEmployee[] = (data.employees || []).map((emp: ApiEmployee) => ({
        id: emp.id,
        user_id: emp.user_id,
        name: emp.users?.name || 'N/A',
        email: emp.users?.email || 'N/A',
        employee_job_title: emp.role, // emp.role is the job title from employees table
        user_app_role: emp.users?.role || 'N/A',
      }));
      setEmployees(transformedEmployees);
    } catch (err) {
      console.error(err);
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

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee: DisplayEmployee) => {
    // Map DisplayEmployee to EmployeeFormEmployee
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
      if (!response.ok) {
        throw new Error(data.error || t("notifications.deactivateError"));
      }
      toast.success(t("notifications.deactivateSuccess", { name: employee.name }));
      fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.deactivateError"));
    } finally {
      setDeactivatingId(null);
    }
  };

  if (isLoading && employees.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <Button disabled><PlusCircle className="mr-2 h-4 w-4" />{t("actions.addEmployee")}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.email")}</TableHead>
              <TableHead>{t("table.jobTitle")}</TableHead>
              <TableHead>{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-28" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <Button onClick={handleAddEmployee} disabled={isLoading}>
         <PlusCircle className="mr-2 h-4 w-4" /> {t("actions.addEmployee")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.name")}</TableHead>
            <TableHead>{t("table.email")}</TableHead>
            <TableHead>{t("table.jobTitle")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24">
                {t("table.noEmployees")}
              </TableCell>
            </TableRow>
          ) : (
            employees.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>{emp.employee_job_title}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditEmployee(emp)} disabled={isLoading || deactivatingId === emp.id}>
                    {t("actions.edit")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQrEmployee(emp)} disabled={isLoading || deactivatingId === emp.id}>
                    <QrCode className="mr-1 h-3 w-3" />
                    {t("actions.qrCode")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:border-destructive"
                    onClick={() => handleDeactivate(emp)}
                    disabled={isLoading || deactivatingId === emp.id}
                  >
                    {deactivatingId === emp.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <UserX className="mr-1 h-3 w-3" />
                    )}
                    {t("actions.deactivate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showEmployeeForm && (
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
      )}

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
