"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { EMPLOYEE_JOB_TITLES } from "@/lib/constants";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EmployeeFormEmployee = {
  id: string;
  name: string;
  email: string;
  employee_job_title: typeof EMPLOYEE_JOB_TITLES[keyof typeof EMPLOYEE_JOB_TITLES];
};

const employeeJobTitleValues = Object.values(EMPLOYEE_JOB_TITLES);
const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  employee_job_title: z.enum(
    employeeJobTitleValues.length > 0
      ? [employeeJobTitleValues[0], ...employeeJobTitleValues.slice(1)]
      : ["manager"]
  ),
});

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, "Bank name is required"),
  branch_name: z.string().optional(),
  account_type: z.enum(["checking", "savings", "current"]),
  account_number: z.string().min(1, "Account number is required"),
  account_holder: z.string().min(1, "Account holder name is required"),
  notes: z.string().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type BankAccountData = z.infer<typeof bankAccountSchema>;

interface EmployeeFormProps {
  employee?: EmployeeFormEmployee | null;
  onClose: () => void;
  onSuccess: () => void;
}

function getJobTitleLabel(value: string) {
  return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const t = useTranslations("owner.employees.form");
  const common_t = useTranslations("common");

  const [bankData, setBankData] = useState<Partial<BankAccountData>>({
    account_type: "checking",
    bank_name: "",
    branch_name: "",
    account_number: "",
    account_holder: "",
    notes: "",
  });
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name || "",
      email: employee?.email || "",
      employee_job_title: employee?.employee_job_title || "manager",
    }
  });

  useEffect(() => {
    if (employee) {
      reset({ name: employee.name, email: employee.email, employee_job_title: employee.employee_job_title });

      // Load existing bank account
      fetch(`/api/v1/owner/employees/${employee.id}/bank-account`)
        .then(r => r.json())
        .then(d => {
          if (d.bankAccount) {
            setHasBankAccount(true);
            setBankData({
              bank_name: d.bankAccount.bank_name ?? "",
              branch_name: d.bankAccount.branch_name ?? "",
              account_type: d.bankAccount.account_type ?? "checking",
              account_number: d.bankAccount.account_number ?? "",
              account_holder: d.bankAccount.account_holder ?? "",
              notes: d.bankAccount.notes ?? "",
            });
          }
        })
        .catch(() => {});
    } else {
      reset({ name: "", email: "", employee_job_title: "manager" });
    }
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      let response;
      if (employee?.id) {
        response = await fetch(`/api/v1/owner/employees/${employee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name, employee_job_title: data.employee_job_title }),
        });
      } else {
        response = await fetch("/api/v1/owner/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      toast.success(employee ? t("notifications.updateSuccess") : t("notifications.createSuccess"));
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("notifications.saveError", { error: "Unknown error" }));
    }
  };

  const handleSaveBank = async () => {
    if (!employee?.id) return;
    const parsed = bankAccountSchema.safeParse(bankData);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(firstError ?? "Please fill in all required bank fields");
      return;
    }
    setIsSavingBank(true);
    try {
      const res = await fetch(`/api/v1/owner/employees/${employee.id}/bank-account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to save bank account");
      setHasBankAccount(true);
      toast.success("Bank account saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setIsSavingBank(false);
    }
  };

  const currentJobTitles = Object.values(EMPLOYEE_JOB_TITLES);

  // For new employees, show only the basic form (no bank account tab yet)
  if (!employee) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">{t("fields.name.label")}</Label>
          <Input id="name" {...register("name")} placeholder={t("fields.name.placeholder")} />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">{t("fields.email.label")}</Label>
          <Input id="email" type="email" {...register("email")} placeholder={t("fields.email.placeholder")} />
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>{t("fields.jobTitle.label")}</Label>
          <Select
            onValueChange={(v) => setValue("employee_job_title", v as EmployeeFormData["employee_job_title"])}
            value={watch("employee_job_title")}
          >
            <SelectTrigger><SelectValue placeholder={t("fields.jobTitle.placeholder")} /></SelectTrigger>
            <SelectContent>
              {currentJobTitles.map(title => (
                <SelectItem key={title} value={title}>{getJobTitleLabel(title)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.employee_job_title && <p className="text-destructive text-sm">{errors.employee_job_title.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Invite Employee"}
          </Button>
        </div>
      </form>
    );
  }

  // Edit mode — two tabs: Info + Bank Account
  return (
    <Tabs defaultValue="info" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
        <TabsTrigger value="bank" className="flex-1">
          Bank Account
          {hasBankAccount && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t("fields.name.label")}</Label>
            <Input id="name" {...register("name")} placeholder={t("fields.name.placeholder")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">{t("fields.email.label")}</Label>
            <Input id="email" type="email" {...register("email")} disabled placeholder={t("fields.email.placeholder")} />
            <p className="text-xs text-muted-foreground">{t("fields.email.editDisabledHint")}</p>
          </div>

          <div className="space-y-1">
            <Label>{t("fields.jobTitle.label")}</Label>
            <Select
              onValueChange={(v) => setValue("employee_job_title", v as EmployeeFormData["employee_job_title"])}
              value={watch("employee_job_title")}
            >
              <SelectTrigger><SelectValue placeholder={t("fields.jobTitle.placeholder")} /></SelectTrigger>
              <SelectContent>
                {currentJobTitles.map(title => (
                  <SelectItem key={title} value={title}>{getJobTitleLabel(title)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_job_title && <p className="text-destructive text-sm">{errors.employee_job_title.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="bank">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Bank Name *</Label>
            <Input
              value={bankData.bank_name ?? ""}
              onChange={(e) => setBankData(d => ({ ...d, bank_name: e.target.value }))}
              placeholder="e.g. Mitsubishi UFJ Bank"
            />
          </div>

          <div className="space-y-1">
            <Label>Branch Name</Label>
            <Input
              value={bankData.branch_name ?? ""}
              onChange={(e) => setBankData(d => ({ ...d, branch_name: e.target.value }))}
              placeholder="e.g. Shibuya Branch"
            />
          </div>

          <div className="space-y-1">
            <Label>Account Type</Label>
            <Select
              value={bankData.account_type ?? "checking"}
              onValueChange={(v) => setBankData(d => ({ ...d, account_type: v as BankAccountData["account_type"] }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking (普通)</SelectItem>
                <SelectItem value="savings">Savings (貯蓄)</SelectItem>
                <SelectItem value="current">Current (当座)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Account Number *</Label>
            <Input
              value={bankData.account_number ?? ""}
              onChange={(e) => setBankData(d => ({ ...d, account_number: e.target.value }))}
              placeholder="e.g. 1234567"
            />
          </div>

          <div className="space-y-1">
            <Label>Account Holder Name *</Label>
            <Input
              value={bankData.account_holder ?? ""}
              onChange={(e) => setBankData(d => ({ ...d, account_holder: e.target.value }))}
              placeholder="Name on the account"
            />
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={bankData.notes ?? ""}
              onChange={(e) => setBankData(d => ({ ...d, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveBank} disabled={isSavingBank}>
              {isSavingBank ? "Saving..." : "Save Bank Account"}
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
