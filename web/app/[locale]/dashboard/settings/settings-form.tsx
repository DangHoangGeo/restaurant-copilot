"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input"; // Assuming @ alias is web
import { Textarea } from "@/components/ui/textarea"; // Assuming @ alias is web
import { Button } from "@/components/ui/button"; // Assuming @ alias is web
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"; // Assuming @ alias is web
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"; // Assuming @ alias is web
import { Label } from "@/components/ui/label"; // Assuming @ alias is web
import { toast } from "sonner";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Restaurant } from "./page";

// Local Restaurant type for the form's initial settings prop.
// If a global Database type were available from Supabase, we might use generated types.

interface SettingsFormProps {
  initialSettings: Restaurant;
  locale: string;
}

const settingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  defaultLanguage: z.enum(["ja", "en", "vi"], { required_error: "Default language is required" }),
  brandColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/, "Invalid hex color format (e.g. #RRGGBB)").nullable().optional(),
  contactInfo: z.string().max(500, "Contact info must be 500 characters or less").optional().nullable(),
  address: z.string().max(500, "Address must be 500 characters or less").optional().nullable(),
  opening_hours: z.string().max(200, "Hours must be 200 characters or less").optional().nullable(),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().nullable(),
  logoFile: z.instanceof(File).refine(file => file.size <= 5 * 1024 * 1024, `Logo must be 5MB or less.`).optional().nullable(),
  logoUrl: z.string().url("Invalid URL format for logo.").optional().nullable(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsForm({ initialSettings, locale }: SettingsFormProps) {
  const t = useTranslations("Dashboard.Settings");
  const tCommon = useTranslations("Common");
  const supabase = createClientComponentClient(); // Untyped client
  const [logoPreview, setLogoPreview] = useState<string | null>(initialSettings.logo_url || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentBrandColor, setCurrentBrandColor] = useState<string | null>(initialSettings.brand_color);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: initialSettings.name || "",
      defaultLanguage: initialSettings.default_language || (["en", "ja", "vi"].includes(locale) ? locale as "en" | "ja" | "vi" : "en"),
      brandColor: initialSettings.brand_color || "#FFFFFF",
      contactInfo: initialSettings.contact_info || "",
      address: initialSettings.address || "",
      opening_hours: initialSettings.opening_hours || "",
      description: initialSettings.description || "",
      logoUrl: initialSettings.logo_url || null,
      logoFile: null,
    },
  });

  const watchedLogoFile = watch("logoFile");

  useEffect(() => {
    if (currentBrandColor) {
      document.documentElement.style.setProperty('--brand-color', currentBrandColor);
    }
  }, [currentBrandColor]);

  useEffect(() => {
    if (watchedLogoFile) {
      const objectUrl = URL.createObjectURL(watchedLogoFile);
      setLogoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (initialSettings.logo_url) {
      setLogoPreview(initialSettings.logo_url);
    } else {
      setLogoPreview(null);
    }
  }, [watchedLogoFile, initialSettings.logo_url]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setValue("logoFile", event.target.files[0], { shouldValidate: true });
    } else {
      setValue("logoFile", null, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    let publicLogoUrl = data.logoUrl || initialSettings.logo_url;

    if (data.logoFile) {
      const filePath = `restaurant-uploads/restaurants/${initialSettings.id}/logos/logo.png`;
      const { error: uploadError } = await supabase.storage
        .from("restaurant-assets")
        .upload(filePath, data.logoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        toast.error(t("notifications.uploadError", { error: uploadError.message }));
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("restaurant-assets").getPublicUrl(filePath);
      publicLogoUrl = urlData.publicUrl;
      setValue("logoUrl", publicLogoUrl); // Update form state with new URL
    }

    try {
      // Get the current subdomain from the initialSettings
      const subdomain = initialSettings.subdomain;
      
      // Call the settings API endpoint
      const response = await fetch(`/api/v1/restaurant/settings?subdomain=${subdomain}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          default_language: data.defaultLanguage,
          brand_color: data.brandColor,
          contact_info: data.contactInfo,
          address: data.address,
          opening_hours: data.opening_hours,
          description: data.description,
          logo_url: publicLogoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const updatedSettings = await response.json();

      toast.success(t("notifications.settingsSaved"));
      if (data.brandColor !== currentBrandColor) {
        setCurrentBrandColor(data.brandColor ?? null);
      }
      // Reset form with new values to make it "clean"
      reset({
        ...data,
        logoFile: null, // Clear file input after successful upload
        logoUrl: publicLogoUrl, // Ensure this is the latest URL
      });
      // Manually update logoPreview if it was just uploaded and not from initialSettings
      if (data.logoFile) {
          setLogoPreview(publicLogoUrl);
      }


    } catch (error) {
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : String(error);
      toast.error(t("notifications.saveError", { error: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Name, Language, Color */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <Label htmlFor="name">{t("labels.restaurantName")}</Label>
          <Input id="name" {...register("name")} maxLength={100} />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="defaultLanguage">{tCommon("defaultLanguageLabel")}</Label>
          <Controller
            name="defaultLanguage"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="defaultLanguage">
                  <SelectValue placeholder={tCommon("defaultLanguagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{tCommon("languageOption.en")}</SelectItem>
                  <SelectItem value="ja">{tCommon("languageOption.ja")}</SelectItem>
                  <SelectItem value="vi">{tCommon("languageOption.vi")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.defaultLanguage && <p className="text-sm text-red-500 mt-1">{errors.defaultLanguage.message}</p>}
        </div>

        <div>
          <Label htmlFor="brandColor">{t("labels.brandColor")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="brandColorText"
              type="text"
              {...register("brandColor")}
              placeholder="#RRGGBB"
              className="w-1/2"
              maxLength={7}
            />
            <Input
              id="brandColorPicker"
              type="color"
              {...register("brandColor")}
              className="w-1/2 h-10 p-1" // Adjust size as needed
            />
          </div>
          {errors.brandColor && <p className="text-sm text-red-500 mt-1">{errors.brandColor.message}</p>}
        </div>
      </div>

      {/* Column 2: Logo, Contact Info, Address */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <Label htmlFor="logoFile">{t("labels.logo")}</Label>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logoPreview || undefined} alt={t("altText.logoPreview")} />
              <AvatarFallback>
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <Input
              id="logoFile"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-primary file:text-primary-foreground
                         hover:file:bg-primary/90"
            />
          </div>
          {errors.logoFile && <p className="text-sm text-red-500 mt-1">{errors.logoFile.message}</p>}
          {errors.logoUrl && !errors.logoFile && <p className="text-sm text-red-500 mt-1">{errors.logoUrl.message}</p>}
        </div>

        <div>
          <Label htmlFor="contactInfo">{t("labels.contactInfo")}</Label>
          <Textarea
            id="contactInfo"
            {...register("contactInfo")}
            maxLength={500}
            placeholder={t("placeholders.contactInfo")}
            rows={3}
          />
          {errors.contactInfo && <p className="text-sm text-red-500 mt-1">{errors.contactInfo.message}</p>}
        </div>

        <div>
          <Label htmlFor="address">{t("labels.address")}</Label>
          <Textarea
            id="address"
            {...register("address")}
            maxLength={500}
            placeholder={t("placeholders.address")}
            rows={3}
          />
          {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>}
        </div>
      </div>

      {/* Column 3: Hours, Description */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <Label htmlFor="hours">{t("labels.hours")}</Label>
          <Textarea
            id="hours"
            {...register("opening_hours")}
            maxLength={200}
            placeholder={t("placeholders.hours")}
            rows={3}
          />
          {errors.opening_hours && <p className="text-sm text-red-500 mt-1">{errors.opening_hours.message}</p>}
        </div>

        <div>
          <Label htmlFor="description">{t("labels.description")}</Label>
          <Textarea
            id="description"
            {...register("description")}
            maxLength={1000}
            placeholder={t("placeholders.description")}
            rows={5}
          />
          {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
        </div>
      </div>

      <div className="md:col-span-3 flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("buttons.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
