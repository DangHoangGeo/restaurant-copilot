"use client";

import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Zod schema for category form validation
const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"), // Increased max length from 50 to 100
  position: z.coerce.number().int("Position must be an integer.").optional().nullable(), // Use coerce for string to number conversion
});

type CategoryFormData = z.infer<typeof categorySchema>;

export interface Category {
  id: string;
  name: string;
  position: number | null;
  // restaurant_id is implicitly handled
}

interface CategoryFormProps {
  initialData?: Category; // Optional: if provided, it's an edit form
  restaurantId: string;
  locale: string; // For redirection or future localized elements
}

export default function CategoryForm({ initialData, restaurantId, locale }: CategoryFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      position: initialData?.position ?? undefined, // Use undefined for optional number fields if null means "not set"
    },
  });

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (initialData) { // Editing existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: data.name,
            position: data.position, // Send null if undefined, or handle as needed
            // restaurant_id is not updated, RLS handles ownership
          })
          .eq("id", initialData.id)
          .eq("restaurant_id", restaurantId); // Important for RLS and security

        if (error) throw error;
        setFeedbackMessage("Category updated successfully!");
      } else { // Creating new category
        // To determine the next position:
        // Option 1: User provides it.
        // Option 2: Auto-calculate. Fetch count of existing categories.
        // For this subtask, if position is not provided, it's inserted as null (or undefined which Supabase might treat as default or null).
        // A DB trigger or separate logic might be better for auto-incrementing position.
        let finalPosition = data.position;
        if (finalPosition === undefined || finalPosition === null) {
            // Fetch current max position + 1 if position is not given
            const { data: maxPosData, error: maxPosError } = await supabase
                .from('categories')
                .select('position')
                .eq('restaurant_id', restaurantId)
                .order('position', { ascending: false })
                .limit(1)
                .single();

            if (maxPosError && maxPosError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine
                console.warn("Could not fetch max position, defaulting position:", maxPosError);
            }
            finalPosition = (maxPosData?.position ?? -1) + 1;
        }

        const { error } = await supabase
          .from("categories")
          .insert([{
            restaurant_id: restaurantId,
            name: data.name,
            position: finalPosition,
          }]);
        if (error) throw error;
        setFeedbackMessage("Category created successfully!");
      }

      // Redirect after a short delay to allow user to see feedback
      setTimeout(() => {
        router.push(`/${locale}/dashboard/menu?restaurantId=${restaurantId}`);
        // router.refresh() might be needed if you want to ensure fresh data on the target page without a full reload
      }, 1000);

    } catch (error: any) {
      console.error("Error processing category:", error);
      setFeedbackMessage(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {feedbackMessage && (
        <div className={`p-3 my-4 rounded ${feedbackMessage.startsWith("Error:") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {feedbackMessage}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">Category Name</label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="position" className="block text-sm font-medium">Position (Order)</label>
        <input
          id="position"
          type="number"
          {...register("position")}
          placeholder="Leave blank for auto"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
      </div>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/dashboard/menu?restaurantId=${restaurantId}`)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Category')}
        </button>
      </div>
    </form>
  );
}
