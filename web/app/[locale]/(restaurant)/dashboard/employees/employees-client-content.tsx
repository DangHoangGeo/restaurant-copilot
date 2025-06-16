"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { List, Calendar, UserPlus, SquarePen, AlertTriangle } from "lucide-react";
import { EmployeesSkeleton } from "@/components/ui/skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  shifts: Record<string, string | null>;
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations("AdminEmployees");
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function EmployeesClientContent() { 
  const t = useTranslations("AdminEmployees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "schedule">("list");
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const roles = ["manager", "chef", "server", "cashier"];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/owner/employees', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  if (isInitialLoading) return <EmployeesSkeleton />;
  if (error) return <ErrorState error={error} onRetry={loadEmployees} />;

  const handleOpenModal = (employee: Employee | null = null) => {
    setEditingEmployee(
      employee || { id: "", name: "", email: "", role: "server", shifts: {} },
    );
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingEmployee) {
      if (editingEmployee.id) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editingEmployee.id ? editingEmployee : emp,
          ),
        );
      } else {
        const newEmp = { ...editingEmployee, id: `emp${Date.now()}` };
        setEmployees((prev) => [...prev, newEmp]);
      }
    }
    setIsModalOpen(false);
  };

  const handleOpenScheduleModal = (employee: Employee) => {
    setScheduleEmployee(employee);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (scheduleEmployee) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === scheduleEmployee.id ? scheduleEmployee : emp,
        ),
      );
    }
    setIsScheduleModalOpen(false);
  };
  
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center space-x-2">
          <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded-xl flex">
            <Button
              size="sm"
              variant={viewMode === "list" ? "primary" : "ghost"}
              onClick={() => setViewMode("list")}
              className={`rounded-lg ${viewMode === "list" ? "" : "text-slate-600 dark:text-slate-300"}`}
            >
              <List className="mr-1 sm:mr-2" /> {t("Common.list")}
            </Button>
            <Button
              size="sm"
              variant={viewMode === "schedule" ? "primary" : "ghost"}
              onClick={() => setViewMode("schedule")}
              className={`rounded-lg ${viewMode === "schedule" ? "" : "text-slate-600 dark:text-slate-300"}`}
            >
              <Calendar className="mr-1 sm:mr-2" /> {t("Common.schedule")}
            </Button>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={isLoading}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t("add_employee")}
        </Button>
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <Card key={employee.id} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{employee.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`Roles.${employee.role}`)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {employee.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(employee)}
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenScheduleModal(employee)}
                >
                  <Calendar className="mr-1 h-4 w-4" />
                  {t("schedule")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-600">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="p-3 border border-slate-300 dark:border-slate-600 text-left font-medium">
                  {t("employee")}
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="p-3 border border-slate-300 dark:border-slate-600 text-center font-medium">
                    {t(`Days.${day}`)}
                  </th>
                ))}
                <th className="p-3 border border-slate-300 dark:border-slate-600 text-center font-medium">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="p-3 border border-slate-300 dark:border-slate-600 font-medium">
                    {emp.name}
                    <br />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t(`Roles.${emp.role}`)}
                    </span>
                  </td>
                  {daysOfWeek.map((day) => (
                    <td key={day} className="p-3 border border-slate-300 dark:border-slate-600 text-center">
                      <div className="text-xs">
                        {emp.shifts[day] || t("off")}
                      </div>
                    </td>
                  ))}
                  <td className="p-3 border border-slate-300 dark:border-slate-600 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenScheduleModal(emp)}
                    >
                      <SquarePen className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee?.id ? t("edit_employee") : t("add_employee")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("name")}</label>
              <Input
                value={editingEmployee?.name || ""}
                onChange={(e) =>
                  setEditingEmployee((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                placeholder={t("enter_name")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("email")}</label>
              <Input
                type="email"
                value={editingEmployee?.email || ""}
                onChange={(e) =>
                  setEditingEmployee((prev) =>
                    prev ? { ...prev, email: e.target.value } : null
                  )
                }
                placeholder={t("enter_email")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("role")}</label>
              <Select
                value={editingEmployee?.role || ""}
                onValueChange={(value) =>
                  setEditingEmployee((prev) =>
                    prev ? { ...prev, role: value } : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_role")} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`Roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("Common.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("Common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("edit_schedule_for", { name: scheduleEmployee?.name || '' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {daysOfWeek.map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-16 text-sm font-medium">
                  {t(`Days.${day}`)}
                </div>
                <Input
                  type="time"
                  value={
                    scheduleEmployee?.shifts[day]?.split("-")[0] || ""
                  }
                  onChange={(e) => {
                    const endTime =
                      scheduleEmployee?.shifts[day]?.split("-")[1] || "";
                    const newShift = e.target.value
                      ? `${e.target.value}-${endTime}`
                      : null;
                    setScheduleEmployee((prev) =>
                      prev
                        ? {
                            ...prev,
                            shifts: { ...prev.shifts, [day]: newShift },
                          }
                        : null
                    );
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">to</span>
                <Input
                  type="time"
                  value={
                    scheduleEmployee?.shifts[day]?.split("-")[1] || ""
                  }
                  onChange={(e) => {
                    const startTime =
                      scheduleEmployee?.shifts[day]?.split("-")[0] || "";
                    const newShift = e.target.value
                      ? `${startTime}-${e.target.value}`
                      : null;
                    setScheduleEmployee((prev) =>
                      prev
                        ? {
                            ...prev,
                            shifts: { ...prev.shifts, [day]: newShift },
                          }
                        : null
                    );
                  }}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              {t("Common.cancel")}
            </Button>
            <Button onClick={handleSaveSchedule}>{t("Common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
