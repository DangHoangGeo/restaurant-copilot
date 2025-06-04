"use client";

import { z } from 'zod';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image'; // For displaying current image

// Zod schema for menu item form validation
const menuItemSchema = z.object({
  name_ja: z.string().min(1, "Japanese name is required").max(150, "Name too long"),
  name_en: z.string().min(1, "English name is required").max(150, "Name too long"),
  name_vi: z.string().min(1, "Vietnamese name is required").max(150, "Name too long"),
  description_ja: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_vi: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative("Price must be non-negative"),
  tags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag) : []), // Transform comma-separated string to array
  available: z.boolean().default(true),
  weekdayVisibility: z.array(z.coerce.number().min(0).max(6)) // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    .min(1, "At least one day must be selected")
    .max(7, "No more than 7 days can be selected"),
  imageFile: z.custom<FileList>(val => val instanceof FileList, "Please upload a file").optional().nullable(), // Use FileList for input type="file"
  image_url: z.string().url().optional().nullable(),
  position: z.coerce.number().int().optional().nullable(), // For ordering within category
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

// Interface for the item data coming from Supabase (props)
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_ja: string;
  name_en: string;
  name_vi: string;
  description_ja?: string | null;
  description_en?: string | null;
  description_vi?: string | null;
  price: number;
  tags?: string[] | null;
  available: boolean;
  weekday_visibility?: number[] | null; // DB stores as array of integers
  image_url?: string | null;
  position?: number | null;
  // any other fields
}

interface MenuItemFormProps {
  initialItemData?: MenuItem;
  restaurantId: string;
  categoryId: string;
  locale: string;
}

const weekDays = [
  { id: 1, label: 'Monday', value: 1 }, // Monday
  { id: 2, label: 'Tuesday', value: 2 },
  { id: 3, label: 'Wednesday', value: 3 },
  { id: 4, label: 'Thursday', value: 4 },
  { id: 5, label: 'Friday', value: 5 },
  { id: 6, label: 'Saturday', value: 6 },
  { id: 0, label: 'Sunday', value: 0 }, // Sunday
];


async function uploadImage(file: File, restaurantId: string, itemId: string | undefined): Promise<string> {
  const supabase = createClientComponentClient();
  const fileExt = file.name.split('.').pop();
  // If itemId is undefined (creating new item), we might need a temporary ID or upload after insert.
  // For simplicity, let's assume itemId will be available (e.g., upload after insert or use a placeholder name strategy)
  // Or, better: create a unique ID for the image path that doesn't rely on potentially non-existent itemId
  const uniqueImageId = crypto.randomUUID();
  const fileName = `menu_item_${itemId || uniqueImageId}_${Date.now()}.${fileExt}`;
  const filePath = `restaurants/${restaurantId}/menu_items/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("restaurant-uploads") // Ensure this bucket exists
    .upload(filePath, file, { upsert: true }); // upsert might be useful if names could collide, though unlikely with Date.now()

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("restaurant-uploads")
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Could not get public URL for the uploaded image.");
  }
  return publicUrlData.publicUrl;
}


export default function MenuItemForm({ initialItemData, restaurantId, categoryId, locale }: MenuItemFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialItemData?.image_url || null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name_ja: initialItemData?.name_ja || "",
      name_en: initialItemData?.name_en || "",
      name_vi: initialItemData?.name_vi || "",
      description_ja: initialItemData?.description_ja || "",
      description_en: initialItemData?.description_en || "",
      description_vi: initialItemData?.description_vi || "",
      price: initialItemData?.price ?? 0,
      tags: initialItemData?.tags?.join(', ') || '', // Convert array to comma-separated string for form input
      available: initialItemData?.available ?? true,
      weekdayVisibility: initialItemData?.weekday_visibility ?? weekDays.map(d => d.value), // Default to all days
      image_url: initialItemData?.image_url || null,
      imageFile: null,
      position: initialItemData?.position ?? undefined,
    },
  });

  const imageFileWatcher = watch("imageFile");

  useEffect(() => {
    if (imageFileWatcher && imageFileWatcher.length > 0) {
      const file = imageFileWatcher[0];
      if (file) {
        setCurrentImageUrl(URL.createObjectURL(file));
      }
    } else if (!imageFileWatcher || imageFileWatcher.length === 0) {
        setCurrentImageUrl(initialItemData?.image_url || null);
    }
  }, [imageFileWatcher, initialItemData?.image_url]);


  const onSubmit: SubmitHandler<MenuItemFormData> = async (formData) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      let newImageUrl = initialItemData?.image_url || null;

      if (formData.imageFile && formData.imageFile.length > 0) {
        // Use initialItemData.id if editing, undefined if creating (uploadImage handles this)
        newImageUrl = await uploadImage(formData.imageFile[0], restaurantId, initialItemData?.id);
      }

      const dataToSubmit = {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name_ja: formData.name_ja,
        name_en: formData.name_en,
        name_vi: formData.name_vi,
        description_ja: formData.description_ja,
        description_en: formData.description_en,
        description_vi: formData.description_vi,
        price: formData.price,
        tags: formData.tags, // Already an array from Zod transform
        available: formData.available,
        weekday_visibility: formData.weekdayVisibility,
        image_url: newImageUrl,
        position: formData.position,
      };

      if (initialItemData) { // Editing
        const { error } = await supabase
          .from("menu_items")
          .update(dataToSubmit)
          .eq("id", initialItemData.id)
          .eq("restaurant_id", restaurantId); // RLS should also enforce this

        if (error) throw error;
        setFeedbackMessage("Menu item updated successfully!");
      } else { // Creating
        // Auto-calculate position if not provided
        if (dataToSubmit.position === undefined || dataToSubmit.position === null) {
            const { data: maxPosData, error: maxPosError } = await supabase
                .from('menu_items')
                .select('position')
                .eq('restaurant_id', restaurantId)
                .eq('category_id', categoryId)
                .order('position', { ascending: false })
                .limit(1)
                .single();
            if (maxPosError && maxPosError.code !== 'PGRST116') { // PGRST116: no rows found
                console.warn("Could not fetch max position for item, defaulting:", maxPosError);
            }
            dataToSubmit.position = (maxPosData?.position ?? -1) + 1;
        }

        const { data: newItems, error } = await supabase
          .from("menu_items")
          .insert([dataToSubmit])
          .select("id") // Important to get the ID of the new item if image was uploaded separately
          .single(); // Assuming single insert

        if (error) throw error;

        // If image was uploaded but URL not set because ID was not known (not an issue with current uploadImage)
        // No: current uploadImage uses a UUID if itemID is not present, so this step is not needed.
        // The image_url is already part of dataToSubmit.

        setFeedbackMessage("Menu item created successfully!");
      }

      setTimeout(() => {
        router.push(`/${locale}/dashboard/menu?restaurantId=${restaurantId}&refresh=${Date.now()}`); // Added refresh param for potential re-fetch
        // router.refresh(); // Consider using this if cache invalidation is an issue
      }, 1000);

    } catch (error: any) {
      console.error("Error processing menu item:", error);
      setFeedbackMessage(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formSectionClass = "mb-6 p-4 border border-gray-200 rounded-md";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const textareaClass = `${inputClass} min-h-[80px]`;
  const errorClass = "mt-1 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
      {feedbackMessage && (
        <div className={`p-3 my-4 rounded ${feedbackMessage.startsWith("Error:") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {feedbackMessage}
        </div>
      )}

      {/* Names Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Names (Multilingual)</h3>
        <div>
          <label htmlFor="name_ja" className={labelClass}>Japanese Name</label>
          <input id="name_ja" type="text" {...register("name_ja")} className={inputClass} />
          {errors.name_ja && <p className={errorClass}>{errors.name_ja.message}</p>}
        </div>
        <div className="mt-4">
          <label htmlFor="name_en" className={labelClass}>English Name</label>
          <input id="name_en" type="text" {...register("name_en")} className={inputClass} />
          {errors.name_en && <p className={errorClass}>{errors.name_en.message}</p>}
        </div>
        <div className="mt-4">
          <label htmlFor="name_vi" className={labelClass}>Vietnamese Name</label>
          <input id="name_vi" type="text" {...register("name_vi")} className={inputClass} />
          {errors.name_vi && <p className={errorClass}>{errors.name_vi.message}</p>}
        </div>
      </div>

      {/* Descriptions Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Descriptions (Multilingual, Optional)</h3>
        <div>
          <label htmlFor="description_ja" className={labelClass}>Japanese Description</label>
          <textarea id="description_ja" {...register("description_ja")} className={textareaClass} />
          {errors.description_ja && <p className={errorClass}>{errors.description_ja.message}</p>}
        </div>
        <div className="mt-4">
          <label htmlFor="description_en" className={labelClass}>English Description</label>
          <textarea id="description_en" {...register("description_en")} className={textareaClass} />
          {errors.description_en && <p className={errorClass}>{errors.description_en.message}</p>}
        </div>
        <div className="mt-4">
          <label htmlFor="description_vi" className={labelClass}>Vietnamese Description</label>
          <textarea id="description_vi" {...register("description_vi")} className={textareaClass} />
          {errors.description_vi && <p className={errorClass}>{errors.description_vi.message}</p>}
        </div>
      </div>

      {/* Price and Availability Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className={labelClass}>Price</label>
              <input id="price" type="number" step="0.01" {...register("price")} className={inputClass} />
              {errors.price && <p className={errorClass}>{errors.price.message}</p>}
            </div>
             <div>
              <label htmlFor="position" className={labelClass}>Position (Order in Category)</label>
              <input id="position" type="number" {...register("position")} placeholder="Auto if blank" className={inputClass} />
              {errors.position && <p className={errorClass}>{errors.position.message}</p>}
            </div>
        </div>
        <div className="mt-4">
          <label htmlFor="available" className={labelClass}>Available</label>
          <Controller
            name="available"
            control={control}
            render={({ field }) => (
              <input type="checkbox" {...field} checked={field.value} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            )}
          />
          {errors.available && <p className={errorClass}>{errors.available.message}</p>}
        </div>
      </div>

      {/* Tags Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Tags</h3>
        <div>
          <label htmlFor="tags" className={labelClass}>Tags (comma-separated)</label>
          <input id="tags" type="text" {...register("tags")} className={inputClass} placeholder="e.g., vegetarian, spicy, popular" />
          {errors.tags && <p className={errorClass}>{errors.tags.message}</p>}
        </div>
      </div>

      {/* Weekday Visibility Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Weekday Visibility</h3>
        <Controller
            name="weekdayVisibility"
            control={control}
            render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {weekDays.map((day) => (
                        <label key={day.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50">
                            <input
                                type="checkbox"
                                value={day.value}
                                checked={field.value?.includes(day.value)}
                                onChange={(e) => {
                                    const selectedDays = field.value ? [...field.value] : [];
                                    if (e.target.checked) {
                                        selectedDays.push(day.value);
                                    } else {
                                        const index = selectedDays.indexOf(day.value);
                                        if (index > -1) selectedDays.splice(index, 1);
                                    }
                                    field.onChange(selectedDays);
                                }}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span>{day.label}</span>
                        </label>
                    ))}
                </div>
            )}
        />
        {errors.weekdayVisibility && <p className={errorClass}>{errors.weekdayVisibility.message}</p>}
      </div>

      {/* Image Upload Section */}
      <div className={formSectionClass}>
        <h3 className="text-lg font-semibold mb-3">Image</h3>
        {currentImageUrl && (
          <div className="mb-3">
            <p className={labelClass}>Current Image:</p>
            <Image src={currentImageUrl} alt="Current menu item" width={150} height={150} className="rounded-md object-cover" />
          </div>
        )}
        <div>
          <label htmlFor="imageFile" className={labelClass}>{currentImageUrl ? "Upload New Image (optional)" : "Upload Image"}</label>
          <input
            id="imageFile"
            type="file"
            {...register("imageFile")}
            accept="image/png, image/jpeg, image/gif, image/webp"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
          />
          {errors.imageFile && <p className={errorClass}>{typeof errors.imageFile.message === "string" ? errors.imageFile.message : "Invalid file"}</p>}
        </div>
      </div>

      {/* Submission Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4">
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
          {isSubmitting ? (initialItemData ? 'Saving...' : 'Creating...') : (initialItemData ? 'Save Changes' : 'Create Menu Item')}
        </button>
      </div>
    </form>
  );
}
