"use client";

import { useState } from "react";
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
import { List, Calendar, UserPlus, SquarePen } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  shifts: Record<string, string | null>;
}

interface EmployeesClientContentProps {
  initialData: Employee[];
}

export function EmployeesClientContent({
  initialData,
}: EmployeesClientContentProps) {
  const t = useTranslations();
  const [employees, setEmployees] = useState<Employee[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "schedule">("list");
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(
    null,
  );
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const roles = ["manager", "chef", "server", "cashier"];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t("AdminNav.admin_employees_title")}
        </h2>
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
          <Button onClick={() => handleOpenModal()}>
            <UserPlus className="mr-1 sm:mr-2" />
            {t("AdminEmployees.add_employee")}
          </Button>
        </div>
      </div>
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <Card key={emp.id} className="p-4 space-y-2">
              <h3 className="text-lg font-semibold">{emp.name}</h3>
              <p className="text-sm text-[--brand-color]">
                {t(`Roles.${emp.role}`)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {emp.email}
              </p>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenModal(emp)}
                >
                  <SquarePen className="mr-1 sm:mr-2" />
                  {t("Common.edit")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {viewMode === "schedule" && (
        <Card className="p-4 space-y-4">
          <p className="p-4 text-sm text-slate-600 dark:text-slate-400">
            {t("AdminEmployees.schedule_calendar_note")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-700 p-2 border dark:border-slate-600 text-left">
                    {t("AdminEmployees.employee_name")}
                  </th>
                  {daysOfWeek.map((day) => (
                    <th
                      key={day}
                      className="p-2 border dark:border-slate-600 text-center"
                    >
                      {t(`Common.weekdays.${day.toLowerCase()}`)}
                    </th>
                  ))}
                  <th className="p-2 border dark:border-slate-600 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 p-2 border dark:border-slate-600 font-medium">
                      {emp.name}
                      <br />
                      <span className="text-xs text-[--brand-color]">
                        {t(`Roles.${emp.role}`)}
                      </span>
                    </td>
                    {daysOfWeek.map((day) => (
                      <td
                        key={day}
                        className="p-1 border dark:border-slate-600 text-center align-top"
                      >
                        <div
                          className={`p-1.5 rounded text-xs min-h-[30px] ${(emp.shifts as Record<string, string | null>)[day] ? "bg-[--brand-color]/20 text-[--brand-color]-700 dark:text-[--brand-color]-300" : "text-slate-400 dark:text-slate-500"}`}
                        >
                          {(emp.shifts as Record<string, string | null>)[day] ||
                            t("Common.off_duty")}
                        </div>
                      </td>
                    ))}
                    <td className="p-1 border dark:border-slate-600 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenScheduleModal(emp)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t dark:border-slate-700 text-right" />
        </Card>
      )}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee?.id
                ? t("AdminEmployees.edit_employee")
                : t("AdminEmployees.add_employee")}
            </DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-3"
            >
              <Input
                name="name"
                value={editingEmployee.name}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    name: e.target.value,
                  })
                }
                placeholder={t("AdminEmployees.form.full_name")}
              />
              <Input
                name="email"
                type="email"
                value={editingEmployee.email}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    email: e.target.value,
                  })
                }
                placeholder={t("AdminEmployees.form.email_lookup_placeholder")}
              />
              <Select
                value={editingEmployee.role}
                onValueChange={(value) =>
                  setEditingEmployee({ ...editingEmployee, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`Roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                {t("Common.zod_form_hint")}
              </p>
              <DialogFooter className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t("Common.cancel")}
                </Button>
                <Button type="submit" variant="primary">
                  {t("Common.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("AdminEmployees.edit_shifts")}</DialogTitle>
          </DialogHeader>
          {scheduleEmployee && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSchedule();
              }}
              className="space-y-3"
            >
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-16 text-sm">
                    {t(`Common.weekdays.${day.toLowerCase()}`)}
                  </span>
                  <Input
                    type="time"
                    value={scheduleEmployee.shifts[day]?.split("-")[0] || ""}
                    onChange={(e) =>
                      setScheduleEmployee({
                        ...scheduleEmployee,
                        shifts: {
                          ...scheduleEmployee.shifts,
                          [day]: e.target.value
                            ? `${e.target.value}-${scheduleEmployee.shifts[day]?.split("-")[1] || ""}`
                            : null,
                        },
                      })
                    }
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={scheduleEmployee.shifts[day]?.split("-")[1] || ""}
                    onChange={(e) =>
                      setScheduleEmployee({
                        ...scheduleEmployee,
                        shifts: {
                          ...scheduleEmployee.shifts,
                          [day]: scheduleEmployee.shifts[day]?.split("-")[0]
                            ? `${scheduleEmployee.shifts[day]?.split("-")[0]}-${e.target.value}`
                            : null,
                        },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              ))}
              <DialogFooter className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsScheduleModalOpen(false)}
                >
                  {t("Common.cancel")}
                </Button>
                <Button type="submit" variant="primary">
                  {t("Common.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
