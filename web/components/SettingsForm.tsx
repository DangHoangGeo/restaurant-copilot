"use client";

import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

// Define the Zod schema for form validation
const settingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  defaultLanguage: z.enum(["ja", "en", "vi"], { message: "Invalid language selected" }),
  brandColor: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/, "Invalid hex color format (e.g., #RRGGBB or #RGB)"),
  contactInfo: z.string().optional().nullable(),
  logoFile: z.instanceof(File).optional().nullable(), // For new file upload
  logoUrl: z.string().url().optional().nullable(), // To store existing URL or new public URL
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface Restaurant {
  id: string;
  name: string;
  default_language: "ja" | "en" | "vi";
  brand_color: string | null;
  contact_info: string | null;
  logo_url: string | null;
  // Add any other fields your restaurant object might have
}

interface SettingsFormProps {
  restaurant: Restaurant;
  locale: string; // Though not directly used in this form, good to have for potential future use
}

export default function SettingsForm({ restaurant, locale }: SettingsFormProps) {
  const supabase = createClientComponentClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(restaurant.logo_url);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: restaurant.name || "",
      defaultLanguage: restaurant.default_language || "en",
      brandColor: restaurant.brand_color || "#000000",
      contactInfo: restaurant.contact_info || "",
      logoFile: null,
      logoUrl: restaurant.logo_url || "",
    },
  });

  const logoFileWatcher = watch("logoFile");

  useEffect(() => {
    if (logoFileWatcher && logoFileWatcher.length > 0) {
      const file = logoFileWatcher[0];
      if (file) {
        setCurrentLogoUrl(URL.createObjectURL(file));
      }
    } else if (!logoFileWatcher || logoFileWatcher.length === 0) {
        // Revert to original logo if selection is cleared
        setCurrentLogoUrl(restaurant.logo_url);
    }
  }, [logoFileWatcher, restaurant.logo_url]);

  const onSubmit: SubmitHandler<SettingsFormData> = async (data) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      let newLogoUrl = restaurant.logo_url; // Keep existing logo URL by default

      // 1. Handle logo upload if a new file is provided
      if (data.logoFile && data.logoFile.size > 0) {
        const file = data.logoFile;
        const filePath = `restaurants/${restaurant.id}/logos/logo-${Date.now()}.${file.name.split('.').pop()}`;

        const { error: uploadError } = await supabase.storage
          .from("restaurant-uploads") // Ensure this bucket exists and has correct policies
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // Overwrite if file with the same name exists
          });

        if (uploadError) {
          throw new Error(`Logo upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("restaurant-uploads")
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Could not get public URL for the uploaded logo.");
        }
        newLogoUrl = publicUrlData.publicUrl;
        setCurrentLogoUrl(newLogoUrl); // Update preview with new public URL
      }

      // 2. Update restaurant details
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          name: data.name,
          default_language: data.defaultLanguage,
          brand_color: data.brandColor,
          contact_info: data.contactInfo,
          logo_url: newLogoUrl, // Update with new or existing URL
        })
        .eq("id", restaurant.id);

      if (updateError) {
        throw new Error(`Failed to update settings: ${updateError.message}`);
      }

      setFeedbackMessage("Settings updated successfully!");
      reset({ // Reset form with new values, clear file input
        ...data,
        logoUrl: newLogoUrl,
        logoFile: null,
      });

    } catch (error: any) {
      console.error("Error updating settings:", error);
      setFeedbackMessage(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {feedbackMessage && (
        <div className={`p-3 rounded ${feedbackMessage.startsWith("Error:") ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {feedbackMessage}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700">Default Language</label>
        <select
          id="defaultLanguage"
          {...register("defaultLanguage")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          <option value="vi">Vietnamese</option>
        </select>
        {errors.defaultLanguage && <p className="mt-1 text-sm text-red-600">{errors.defaultLanguage.message}</p>}
      </div>

      <div>
        <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">Brand Color (Hex)</label>
        <input
          id="brandColor"
          type="text"
          {...register("brandColor")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="#RRGGBB"
        />
        {errors.brandColor && <p className="mt-1 text-sm text-red-600">{errors.brandColor.message}</p>}
      </div>

      <div>
        <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700">Contact Info</label>
        <textarea
          id="contactInfo"
          {...register("contactInfo")}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.contactInfo && <p className="mt-1 text-sm text-red-600">{errors.contactInfo.message}</p>}
      </div>

      <div>
        <label htmlFor="logoFile" className="block text-sm font-medium text-gray-700">Logo</label>
        {currentLogoUrl && (
          <div className="mt-2 mb-2">
            <img src={currentLogoUrl} alt="Current Logo" className="h-20 w-auto rounded" />
          </div>
        )}
        <input
          id="logoFile"
          type="file"
          {...register("logoFile")}
          accept="image/png, image/jpeg, image/gif"
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
        />
        {errors.logoFile && <p className="mt-1 text-sm text-red-600">{typeof errors.logoFile.message === 'string' ? errors.logoFile.message : "Invalid file"}</p>}
         <input type="hidden" {...register("logoUrl")} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
