"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Globe, Clock, MessageSquare, User, CreditCard, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import imageCompression from 'browser-image-compression';
import { OperatingHoursEditor } from "@/components/features/admin/dashboard/OperatingHoursEditor";
import { SocialLinksEditor } from "@/components/features/admin/dashboard/SocialLinksEditor";
import { DescriptionGenerator } from "@/components/features/admin/dashboard/DescriptionGenerator";
import { Restaurant } from "@/shared/types";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";

interface SettingsFormProps {
  initialSettings: Restaurant;
  locale: string;
}

// Function to create schema, so it can receive the translator function
const getSettingsSchema = (t: ReturnType<typeof useTranslations<'Dashboard.Settings.validation'>>) => z.object({
  name: z.string().min(1, t("name.required")).max(100, t("name.maxLength", { maxLength: 100 })),
  subdomain: z.string().min(3, t("subdomain.minLength", { minLength: 3 })).max(50, t("subdomain.maxLength", { maxLength: 50 }))
    .regex(/^[a-z0-9-]+$/, t("subdomain.invalidFormat")).optional(),
  defaultLanguage: z.enum(["ja", "en", "vi"], { required_error: t("defaultLanguage.required") }),
  brandColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/, t("brandColor.invalidFormat")).nullable().optional(),
  address: z.string().max(500, t("address.maxLength", { maxLength: 500 })).optional().nullable(),
  phone: z.string().max(50, t("phone.maxLength", { maxLength: 50 })).optional().nullable(),
  email: z.string().max(100, t("email.maxLength", { maxLength: 100 })).optional().nullable()
    .refine((val) => !val || val === "" || z.string().email().safeParse(val).success, t("email.invalidFormat")),
  website: z.string().max(200, t("website.maxLength", { maxLength: 200 })).optional().nullable()
    .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, t("website.invalidFormat")),
  tax: z.number().min(0, t("tax.min")).max(1, t("tax.max")).optional(),
  opening_hours: z.record(z.string(), z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
    isClosed: z.boolean().optional()
  })).optional(),
  description_en: z.string().max(1000, t("description.maxLength", { maxLength: 1000 })).optional().nullable(),
  description_ja: z.string().max(1000, t("description.maxLength", { maxLength: 1000 })).optional().nullable(),
  description_vi: z.string().max(1000, t("description.maxLength", { maxLength: 1000 })).optional().nullable(),
  social_links: z.object({
    facebook: z.string().optional().nullable()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, t("socialLinks.invalidUrl")),
    instagram: z.string().optional().nullable()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, t("socialLinks.invalidUrl")),
    twitter: z.string().optional().nullable()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, t("socialLinks.invalidUrl")),
    website: z.string().optional().nullable()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, t("socialLinks.invalidUrl")),
  }).optional(),
  currency: z.enum(["JPY", "USD", "VND"], { required_error: t("currency.required") }).optional(),
  payment_methods: z.array(z.enum(["cash", "credit_card", "mobile_payment", "paypay"])).optional(),
  delivery_options: z.array(z.enum(["pickup", "delivery", "dine_in"])).optional(),
  allow_order_notes: z.boolean().optional(),
  logoFile: z.instanceof(File)
    .refine(file => file.size <= 1 * 1024 * 1024, t("logoFile.maxSize", { maxSize: 1 }))
    .refine(file => ["image/png", "image/jpeg", "image/webp"].includes(file.type), t("logoFile.invalidType"))
    .optional().nullable(),
  logoUrl: z.string().url(t("logoUrl.invalidFormat")).optional().nullable(),
});

export default function SettingsForm({ initialSettings, locale }: SettingsFormProps) {
  const t = useTranslations("owner.settings");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("owner.settings.validation");
  const { updateSettings } = useRestaurantSettings();

  const settingsSchema = getSettingsSchema(tValidation);
  type SettingsFormData = z.infer<typeof settingsSchema>;
  const supabase = createClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(initialSettings.logo_url || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentBrandColor, setCurrentBrandColor] = useState<string | null>(initialSettings.brand_color);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState<boolean>(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Initialize operating hours from existing data or defaults
  const [operatingHours, setOperatingHours] = useState(() => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const defaultHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string; isClosed: boolean }> = {};
    
    days.forEach(day => {
      defaultHours[day] = {
        isOpen: true,
        openTime: '09:00',
        closeTime: '21:00',
        isClosed: false
      };
    });

    if (initialSettings.opening_hours) {
      try {
        const existing = typeof initialSettings.opening_hours === 'string' 
          ? JSON.parse(initialSettings.opening_hours) 
          : initialSettings.opening_hours;
        
        days.forEach(day => {
          if (existing[day]) {
            defaultHours[day] = {
              isOpen: !existing[day].isClosed,
              openTime: existing[day].openTime || '09:00',
              closeTime: existing[day].closeTime || '21:00',
              isClosed: existing[day].isClosed || false
            };
          }
        });
      } catch {
        console.error('Error parsing opening hours');
      }
    }

    return defaultHours;
  });

  // Parse social links from initialSettings
  const initialSocialLinks = useState(() => {
    if (initialSettings.social_links) {
      try {
        return typeof initialSettings.social_links === 'string'
          ? JSON.parse(initialSettings.social_links)
          : initialSettings.social_links;
      } catch {
        return {};
      }
    }
    return {};
  })[0];

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
      subdomain: initialSettings.subdomain || "",
      defaultLanguage: initialSettings.default_language || (["en", "ja", "vi"].includes(locale) ? locale as "en" | "ja" | "vi" : "en"),
      brandColor: initialSettings.brand_color || "#FFFFFF",
      address: initialSettings.address || "",
      phone: initialSettings.phone || "",
      email: initialSettings.email || "",
      website: initialSettings.website || "",
      tax: initialSettings.tax || 0.10,
      opening_hours: operatingHours,
      description_en: initialSettings.description_en || "",
      description_ja: initialSettings.description_ja || "",
      description_vi: initialSettings.description_vi || "",
      social_links: initialSocialLinks,
      currency: initialSettings.currency as "JPY" | "USD" | "VND" || "JPY",
      payment_methods: (initialSettings.payment_methods as ("cash" | "credit_card" | "mobile_payment" | "paypay")[]) || ["cash"],
      delivery_options: (initialSettings.delivery_options as ("pickup" | "delivery" | "dine_in")[]) || ["dine_in"],
      allow_order_notes: initialSettings.allow_order_notes ?? true,
      logoUrl: initialSettings.logo_url || null,
      logoFile: null,
    },
  });

  const watchedLogoFile = watch("logoFile");
  const watchedSubdomain = watch("subdomain");

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

  // Check subdomain availability
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!watchedSubdomain || watchedSubdomain === initialSettings.subdomain || watchedSubdomain.length < 3) {
        setSubdomainAvailable(null);
        return;
      }

      setIsCheckingSubdomain(true);
      try {
        const response = await fetch(`/api/v1/restaurant/check-subdomain?subdomain=${watchedSubdomain}`);
        const data = await response.json();
        setSubdomainAvailable(data.available);
      } catch (error) {
        console.error('Error checking subdomain:', error);
        setSubdomainAvailable(null);
      } finally {
        setIsCheckingSubdomain(false);
      }
    };

    const timeoutId = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedSubdomain, initialSettings.subdomain]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      try {
        const compressedFileBlob = await imageCompression(file, options);
        const newFileObject = new File([compressedFileBlob], file.name, {
          type: compressedFileBlob.type,
          lastModified: Date.now(),
        });
        setValue("logoFile", newFileObject, { shouldValidate: true });
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error(t("notifications.compressionError"));
        setValue("logoFile", null, { shouldValidate: true });
      }
    } else {
      setValue("logoFile", null, { shouldValidate: true });
    }
  };

  const handleSocialLinksChange = (socialLinks: { facebook?: string | null; instagram?: string | null; twitter?: string | null; website?: string | null }) => {
    setValue("social_links", socialLinks);
  };

  const handleDescriptionGenerated = (descriptions: {
    description_en: string;
    description_ja: string;
    description_vi: string;
  }) => {
    setValue("description_en", descriptions.description_en);
    setValue("description_ja", descriptions.description_ja);
    setValue("description_vi", descriptions.description_vi);
  };

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    let publicLogoUrl = data.logoUrl || initialSettings.logo_url;

    if (data.logoFile) {
      const filePath = `restaurants/${initialSettings.id}/logos/logo.png`;
      const { error: uploadError } = await supabase.storage
        .from("restaurant-uploads")
        .upload(filePath, data.logoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        toast.error(t("notifications.uploadError", { error: uploadError.message }));
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("restaurant-uploads").getPublicUrl(filePath);
      publicLogoUrl = urlData.publicUrl;
      setValue("logoUrl", publicLogoUrl);
    }

    try {
      const subdomain = initialSettings.subdomain;
      
      const response = await fetch(`/api/v1/restaurant/settings?subdomain=${subdomain}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          subdomain: data.subdomain,
          default_language: data.defaultLanguage,
          brand_color: data.brandColor,
          tax: data.tax,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          opening_hours: data.opening_hours,
          description_en: data.description_en,
          description_ja: data.description_ja,
          description_vi: data.description_vi,
          social_links: data.social_links,
          currency: data.currency,
          payment_methods: data.payment_methods,
          delivery_options: data.delivery_options,
          allow_order_notes: data.allow_order_notes,
          logo_url: publicLogoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("notifications.settingsSaveFailedGeneric"));
      }

      const updatedSettings = await response.json();

      // Update the context with the new settings
      updateSettings(updatedSettings);

      toast.success(t("notifications.settingsSaved"));
      if (data.brandColor !== currentBrandColor) {
        setCurrentBrandColor(data.brandColor ?? null);
      }

      reset({
        ...data,
        logoFile: null,
        logoUrl: updatedSettings.logo_url || publicLogoUrl,
      });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-6 min-w-max lg:min-w-0">
            <TabsTrigger value="basic" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <User className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.basic")}</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <Globe className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.domain")}</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <Clock className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.hours")}</span>
            </TabsTrigger>
            <TabsTrigger value="descriptions" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <MessageSquare className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.descriptions")}</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <CreditCard className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.business")}</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-4">
              <Truck className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{t("tabs.delivery")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("basicInfo.title")}</CardTitle>
              <CardDescription>{t("basicInfo.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
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
                    <Label htmlFor="phone">{t("labels.phone")}</Label>
                    <Input id="phone" {...register("phone")} maxLength={50} placeholder={t("placeholders.phone")} />
                    {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">{t("labels.email")}</Label>
                    <Input id="email" type="email" {...register("email")} maxLength={100} placeholder={t("placeholders.email")} />
                    {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="website">{t("labels.website")}</Label>
                    <Input id="website" type="url" {...register("website")} maxLength={200} placeholder={t("placeholders.website")} />
                    {errors.website && <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>}
                  </div>
                </div>

                <div className="space-y-4">
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
                    <Label htmlFor="brandColor">{t("labels.brandColor")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="brandColorText"
                        type="text"
                        {...register("brandColor")}
                        placeholder={t("placeholders.brandColor")}
                        className="flex-1"
                        maxLength={7}
                      />
                      <Input
                        id="brandColorPicker"
                        type="color"
                        {...register("brandColor")}
                        className="w-16 h-10 p-1"
                      />
                    </div>
                    {errors.brandColor && <p className="text-sm text-red-500 mt-1">{errors.brandColor.message}</p>}
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

                  <div>
                    <Label htmlFor="tax">{t("labels.tax")}</Label>
                    <Input
                      id="tax"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      {...register("tax", { valueAsNumber: true })}
                      placeholder={t("placeholders.tax")}
                    />
                    {errors.tax && <p className="text-sm text-red-500 mt-1">{errors.tax.message}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Management Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("domainManagement.title")}</CardTitle>
              <CardDescription>{t("domainManagement.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subdomain">{t("labels.subdomain")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    {...register("subdomain")}
                    placeholder={t("placeholders.subdomain")}
                    maxLength={50}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">.coorder.ai</span>
                </div>
                
                {isCheckingSubdomain && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">{t("domainManagement.checking")}</span>
                  </div>
                )}
                
                {subdomainAvailable === true && watchedSubdomain && (
                  <p className="text-sm text-green-600 mt-1">{t("domainManagement.available")}</p>
                )}
                
                {subdomainAvailable === false && watchedSubdomain && (
                  <p className="text-sm text-red-600 mt-1">{t("domainManagement.unavailable")}</p>
                )}
                
                {errors.subdomain && <p className="text-sm text-red-500 mt-1">{errors.subdomain.message}</p>}
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">{t("domainManagement.infoTitle")}</h4>
                <p className="text-sm text-blue-800 mt-1">{t("domainManagement.infoText")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operating Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("operatingHours.title")}</CardTitle>
              <CardDescription>{t("operatingHours.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <OperatingHoursEditor
                value={operatingHours}
                onChange={setOperatingHours}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Descriptions Tab */}
        <TabsContent value="descriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("descriptions.title")}</CardTitle>
              <CardDescription>{t("descriptions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DescriptionGenerator
                restaurantName={watch("name")}
                onGenerated={handleDescriptionGenerated}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="description_en">{t("labels.descriptionEn")}</Label>
                  <Textarea
                    id="description_en"
                    {...register("description_en")}
                    maxLength={1000}
                    placeholder={t("placeholders.descriptionEn")}
                    rows={4}
                  />
                  {errors.description_en && <p className="text-sm text-red-500 mt-1">{errors.description_en.message}</p>}
                </div>

                <div>
                  <Label htmlFor="description_ja">{t("labels.descriptionJa")}</Label>
                  <Textarea
                    id="description_ja"
                    {...register("description_ja")}
                    maxLength={1000}
                    placeholder={t("placeholders.descriptionJa")}
                    rows={4}
                  />
                  {errors.description_ja && <p className="text-sm text-red-500 mt-1">{errors.description_ja.message}</p>}
                </div>

                <div>
                  <Label htmlFor="description_vi">{t("labels.descriptionVi")}</Label>
                  <Textarea
                    id="description_vi"
                    {...register("description_vi")}
                    maxLength={1000}
                    placeholder={t("placeholders.descriptionVi")}
                    rows={4}
                  />
                  {errors.description_vi && <p className="text-sm text-red-500 mt-1">{errors.description_vi.message}</p>}
                </div>
              </div>

              <SocialLinksEditor
                value={watch("social_links") || {}}
                onChange={handleSocialLinksChange}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("businessSettings.title")}</CardTitle>
              <CardDescription>{t("businessSettings.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currency">{t("labels.currency")}</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder={t("placeholders.currency")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JPY">{t("currencyOptions.JPY")}</SelectItem>
                        <SelectItem value="USD">{t("currencyOptions.USD")}</SelectItem>
                        <SelectItem value="VND">{t("currencyOptions.VND")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.currency && <p className="text-sm text-red-500 mt-1">{errors.currency.message}</p>}
              </div>

              <div>
                <Label>{t("labels.paymentMethods")}</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {[
                    { value: "cash", label: t("paymentMethods.cash") },
                    { value: "credit_card", label: t("paymentMethods.creditCard") },
                    { value: "mobile_payment", label: t("paymentMethods.mobilePayment") },
                    { value: "paypay", label: t("paymentMethods.paypay") }
                  ].map((method) => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <Controller
                        name="payment_methods"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id={`payment_${method.value}`}
                            checked={field.value?.includes(method.value as "cash" | "credit_card" | "mobile_payment" | "paypay") || false}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, method.value as "cash" | "credit_card" | "mobile_payment" | "paypay"]);
                              } else {
                                field.onChange(current.filter((v: string) => v !== method.value));
                              }
                            }}
                          />
                        )}
                      />
                      <Label htmlFor={`payment_${method.value}`} className="text-sm">
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.payment_methods && <p className="text-sm text-red-500 mt-1">{errors.payment_methods.message}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Options Tab */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("deliveryOptions.title")}</CardTitle>
              <CardDescription>{t("deliveryOptions.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>{t("labels.deliveryOptions")}</Label>
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {[
                    { value: "dine_in", label: t("deliveryOptions.dineIn") },
                    { value: "pickup", label: t("deliveryOptions.pickup") },
                    { value: "delivery", label: t("deliveryOptions.delivery") }
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Controller
                        name="delivery_options"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id={`delivery_${option.value}`}
                            checked={field.value?.includes(option.value as "pickup" | "delivery" | "dine_in") || false}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, option.value as "pickup" | "delivery" | "dine_in"]);
                              } else {
                                field.onChange(current.filter((v: string) => v !== option.value));
                              }
                            }}
                          />
                        )}
                      />
                      <Label htmlFor={`delivery_${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.delivery_options && <p className="text-sm text-red-500 mt-1">{errors.delivery_options.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Order Experience */}
          <Card>
            <CardHeader>
              <CardTitle>{t("orderExperience.title")}</CardTitle>
              <CardDescription>{t("orderExperience.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="allow_order_notes"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow_order_notes" className="text-sm font-medium cursor-pointer">
                        {t("orderExperience.allowOrderNotes")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("orderExperience.allowOrderNotesDescription")}
                      </p>
                    </div>
                    <Switch
                      id="allow_order_notes"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("buttons.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
