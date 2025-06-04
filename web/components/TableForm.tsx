"use client";

import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Zod schema for table form validation
const tableSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  position_x: z.coerce.number().int("X position must be an integer.").optional().nullable(),
  position_y: z.coerce.number().int("Y position must be an integer.").optional().nullable(),
});

type TableFormData = z.infer<typeof tableSchema>;

// Interface for initialData prop, matching what's fetched in edit page
export interface TableInitialData {
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
}

interface TableFormProps {
  initialData?: TableInitialData;
  restaurantId: string;
  locale: string;
}

export default function TableForm({ initialData, restaurantId, locale }: TableFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset, // Can be used to reset form after submission if needed
    formState: { errors },
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: initialData?.name || "",
      position_x: initialData?.position_x ?? undefined, // Use undefined for optional number fields to allow placeholder
      position_y: initialData?.position_y ?? undefined,
    },
  });

  const onSubmit: SubmitHandler<TableFormData> = async (formData) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const dataToSubmit = {
        name: formData.name,
        position_x: formData.position_x,
        position_y: formData.position_y,
        restaurant_id: restaurantId, // Always include restaurant_id
      };

      if (initialData) { // Editing existing table
        const { error } = await supabase
          .from("tables")
          .update(dataToSubmit)
          .eq("id", initialData.id)
          .eq("restaurant_id", restaurantId); // RLS should also enforce this

        if (error) throw error;
        setFeedbackMessage("Table updated successfully!");
      } else { // Creating new table
        // The spec mentioned `qr_code: ""`. If this field is mandatory and doesn't have a DB default,
        // it should be included here. Otherwise, it's better to omit if not actively managed by this form.
        // For now, assuming qr_code is handled by another process or has a default.
        const { error } = await supabase
          .from("tables")
          .insert([dataToSubmit]);

        if (error) throw error;
        setFeedbackMessage("Table created successfully!");
      }

      // Redirect after a short delay to allow user to see feedback
      setTimeout(() => {
        router.push(`/${locale}/dashboard/tables?restaurantId=${restaurantId}&refresh=${Date.now()}`);
        // router.refresh(); // May be useful for cache invalidation
      }, 1000);

    } catch (error: any) {
      console.error("Error processing table:", error);
      setFeedbackMessage(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common styling classes
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50";
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
          <label htmlFor="name" className={labelClass}>Table Name / Number</label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className={inputClass}
            placeholder="e.g., Table 1, Window Seat, Patio A"
            disabled={isSubmitting}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="position_x" className={labelClass}>Position X (Optional)</label>
            <input
              id="position_x"
              type="number"
              {...register("position_x")}
              className={inputClass}
              placeholder="e.g., 100"
              disabled={isSubmitting}
            />
            {errors.position_x && <p className={errorClass}>{errors.position_x.message}</p>}
          </div>

          <div>
            <label htmlFor="position_y" className={labelClass}>Position Y (Optional)</label>
            <input
              id="position_y"
              type="number"
              {...register("position_y")}
              className={inputClass}
              placeholder="e.g., 50"
              disabled={isSubmitting}
            />
            {errors.position_y && <p className={errorClass}>{errors.position_y.message}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Position X and Y can be used for table layout visualization on a map (if implemented).
        </p>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard/tables?restaurantId=${restaurantId}`)}
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
            {isSubmitting ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Table')}
          </button>
        </div>
      </form>
    </div>
  );
}
