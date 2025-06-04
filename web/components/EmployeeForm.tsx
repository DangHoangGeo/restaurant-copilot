"use client";

import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
// Assuming EmployeeFormData is exported from edit page, or define it here
// For simplicity, let's redefine a similar structure for initialData prop
interface EmployeeFormInitialData {
  id: string;
  role: "chef" | "server" | "cashier" | "manager" | string;
  user_id: string;
  users: { // users relation
    email: string | null;
  } | null;
}

interface EmployeeFormProps {
  initialData?: EmployeeFormInitialData;
  restaurantId: string;
  locale: string;
}

// Zod schema for employee form validation
const employeeSchema = z.object({
  // userEmail is only for creation. For editing, we use initialData.users.email.
  // If userEmail field is part of the form data for edit, it should be optional or handled differently.
  userEmail: z.string().email("Invalid email address")
    .optional() // Make it optional as it's disabled and not submitted for edits
    .or(z.literal('')), // Allow empty string if it's rendered but disabled
  role: z.enum(["chef", "server", "cashier", "manager"], {
    required_error: "Role is required.",
    invalid_type_error: "Invalid role selected.",
  }),
});

type EmployeeFormValidationSchema = z.infer<typeof employeeSchema>;

export default function EmployeeForm({ initialData, restaurantId, locale }: EmployeeFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue, // To potentially set values if needed
  } = useForm<EmployeeFormValidationSchema>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      userEmail: initialData?.users?.email || "",
      role: initialData?.role as "chef" | "server" | "cashier" | "manager" | undefined, // Cast if role enum matches
    },
  });

  const onSubmit: SubmitHandler<EmployeeFormValidationSchema> = async (formData) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (initialData) { // Editing existing employee
        const { error: updateError } = await supabase
          .from("employees")
          .update({ role: formData.role })
          .eq("id", initialData.id)
          .eq("restaurant_id", restaurantId); // RLS should also enforce this

        if (updateError) throw updateError;
        setFeedbackMessage("Employee role updated successfully!");

      } else { // Creating new employee
        if (!formData.userEmail) {
          // This should ideally be caught by Zod if userEmail was required for create
          throw new Error("User email is required to add a new employee.");
        }
        // 1. Look up user by email within the same restaurant_id
        //    This assumes users are already associated with a restaurant_id at the `users` table level,
        //    or that there's a general pool of users and you're linking them.
        //    The prompt implies `.eq("restaurant_id", restaurantId)` on users table, which might not be standard
        //    for a general users table. Adjust if users are global.
        //    For now, assuming users are not directly tied to a specific restaurant in the `users` table itself,
        //    but rather through the `employees` table. So, just find a global user by email.
        const { data: userData, error: userError } = await supabase
          .from("users") // Standard Supabase users table
          .select("id")
          .eq("email", formData.userEmail)
          .single();

        if (userError || !userData) {
          console.error("User lookup error:", userError);
          setFeedbackMessage(`User with email "${formData.userEmail}" not found. Please ensure they have a user account.`);
          setIsSubmitting(false);
          return;
        }

        // 2. Check if this user is already an employee at this restaurant
        const { data: existingEmployee, error: existingEmployeeError } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", userData.id)
          .eq("restaurant_id", restaurantId)
          .maybeSingle(); // Use maybeSingle as it's okay if no record is found

        if (existingEmployeeError && existingEmployeeError.code !== 'PGRST116') { // PGRST116: ignore "No rows found"
            throw existingEmployeeError;
        }
        if (existingEmployee) {
            setFeedbackMessage(`This user is already an employee at this restaurant.`);
            setIsSubmitting(false);
            return;
        }

        // 3. If user found and not already an employee, insert into "employees" table
        const { error: insertError } = await supabase
          .from("employees")
          .insert([{
            restaurant_id: restaurantId,
            user_id: userData.id,
            role: formData.role,
          }]);

        if (insertError) throw insertError;
        setFeedbackMessage("Employee added successfully!");
      }

      setTimeout(() => {
        router.push(`/${locale}/dashboard/employees?restaurantId=${restaurantId}&refresh=${Date.now()}`);
      }, 1000);

    } catch (error: any) {
      console.error("Error processing employee:", error);
      setFeedbackMessage(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500";
  const selectClass = inputClass;
  const errorClass = "mt-1 text-sm text-red-600";
  const buttonPrimaryClass = "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";
  const buttonSecondaryClass = "px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {feedbackMessage && (
          <div className={`p-3 my-4 rounded-md text-sm ${feedbackMessage.startsWith("Error:") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {feedbackMessage}
          </div>
        )}

        <div>
          <label htmlFor="userEmail" className={labelClass}>User's Email Address</label>
          <input
            id="userEmail"
            type="email"
            {...register("userEmail")}
            className={inputClass}
            placeholder="employee@example.com"
            disabled={!!initialData || isSubmitting} // Disable if editing
          />
          {errors.userEmail && <p className={errorClass}>{errors.userEmail.message}</p>}
           {initialData && <p className="text-xs text-gray-500 mt-1">Email cannot be changed for existing employees.</p>}
        </div>

        <div>
          <label htmlFor="role" className={labelClass}>Role</label>
          <select
            id="role"
            {...register("role")}
            className={selectClass}
            disabled={isSubmitting}
          >
            <option value="">Select a role...</option>
            <option value="chef">Chef</option>
            <option value="server">Server</option>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </select>
          {errors.role && <p className={errorClass}>{errors.role.message}</p>}
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard/employees?restaurantId=${restaurantId}`)}
            className={buttonSecondaryClass}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={buttonPrimaryClass}
          >
            {isSubmitting ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Employee')}
          </button>
        </div>
      </form>
    </div>
  );
}
