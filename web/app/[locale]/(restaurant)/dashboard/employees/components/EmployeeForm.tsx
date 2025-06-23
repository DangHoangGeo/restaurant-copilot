"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Assuming Shadcn UI
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { EMPLOYEE_JOB_TITLES } from "@/lib/constants";
import { toast } from "sonner"; // Assuming sonner is used for toasts

// Employee type based on what the form receives and what list might provide
// This might differ slightly from the full API response type.
export type EmployeeFormEmployee = {
  id: string; // This is employees.id
  name: string;
  email: string;
  employee_job_title: typeof EMPLOYEE_JOB_TITLES[keyof typeof EMPLOYEE_JOB_TITLES]; // Use the values (lowercase)
  // user_id might also be relevant if updates need it, but API takes employees.id for PUT path
};

// Schema for form validation - matches POST /api/v1/owner/employees body
// and relevant fields for PUT /api/v1/owner/employees/[employeeId]
const employeeJobTitleValues = Object.values(EMPLOYEE_JOB_TITLES);
const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  // Use the actual values (lowercase) that are sent to the API
  employee_job_title: z.enum(employeeJobTitleValues.length > 0 ? [employeeJobTitleValues[0], ...employeeJobTitleValues.slice(1)] : ["manager"]),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee?: EmployeeFormEmployee | null; // For editing
  onClose: () => void;
  onSuccess: () => void; // Changed from onSave to onSuccess for clarity
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const t = useTranslations("owner.employees.form");
  const common_t = useTranslations("common"); // For generic terms like "Save", "Cancel" if needed

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name || "",
      email: employee?.email || "",
      employee_job_title: employee?.employee_job_title || "manager", // Default to first job title value
    }
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        email: employee.email,
        employee_job_title: employee.employee_job_title,
      });
    } else {
      reset({ // Default for new employee
        name: "",
        email: "",
        employee_job_title: "manager", // Use lowercase value
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      let response;
      if (employee?.id) {
        // Update existing employee (PUT request)
        // Note: API for update allows name and employee_job_title. Email is not updatable via this form.
        response = await fetch(`/api/v1/owner/employees/${employee.id}`, {
          method: "PATCH", // Using PATCH as per backend for partial updates
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name, // Only send fields that can be updated
            employee_job_title: data.employee_job_title,
          }),
        });
      } else {
        // Create new employee (POST request)
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

      // const result = await response.json(); // Contains created/updated employee
      toast.success(employee ? t("notifications.updateSuccess") : t("notifications.createSuccess"));
      onSuccess(); // Call onSuccess to close modal and refresh list

    } catch (error) {
      console.error("Failed to save employee:", error);
      toast.error(error instanceof Error ? error.message : t("notifications.saveError"));
    }
  };

  const currentJobTitles = Object.values(EMPLOYEE_JOB_TITLES);
  
  // Helper function to get display label for job title
  const getJobTitleLabel = (value: string) => {
    // Capitalize first letter of each word for better display
    return value.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    // Removed the modal container (fixed inset-0 div) - this will be rendered inside a DialogContent
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title is now part of DialogHeader in EmployeeList */}
      {/* <h2 className="text-xl font-semibold mb-4">{employee ? t("editTitle") : t("addTitle")}</h2> */}

      <div className="space-y-1">
        <Label htmlFor="name">{t("fields.name.label")}</Label>
        <Input id="name" {...register("name")} placeholder={t("fields.name.placeholder")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">{t("fields.email.label")}</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled={!!employee} // Email not editable for existing employees through this form
          placeholder={t("fields.email.placeholder")}
        />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        {!!employee && <p className="text-xs text-muted-foreground">{t("fields.email.editDisabledHint")}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="employee_job_title">{t("fields.jobTitle.label")}</Label>
        <Select 
          onValueChange={(value) => setValue("employee_job_title", value as typeof EMPLOYEE_JOB_TITLES[keyof typeof EMPLOYEE_JOB_TITLES])} 
          value={watch("employee_job_title")}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("fields.jobTitle.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {currentJobTitles.map(title => (
              <SelectItem key={title} value={title}>
                {getJobTitleLabel(title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employee_job_title && <p className="text-destructive text-sm">{errors.employee_job_title.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          {common_t("actions.cancel", {defaultValue: "Cancel"})}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? common_t("actions.saving", {defaultValue: "Saving..."}) : common_t("actions.save", {defaultValue: "Save"})}
        </Button>
      </div>
    </form>
  );
}
