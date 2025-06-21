'use client'

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Upload, 
  Loader2,
  Save,
  AlertCircle,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";

const ownerStorySchema = z.object({
  owner_story_en: z.string().max(1000).optional(),
  owner_story_ja: z.string().max(1000).optional(),
  owner_story_vi: z.string().max(1000).optional(),
  photo_url: z.string().optional(),
});

type OwnerStoryFormData = z.infer<typeof ownerStorySchema>;

interface OwnerStoryEditorProps {
  locale: string;
}

export function OwnerStoryEditor({ }: OwnerStoryEditorProps) {
  const t = useTranslations("owner.homepage.ownerStory");
  const { restaurantSettings, isLoading: contextLoading, updateSettings } = useRestaurantSettings();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue
  } = useForm<OwnerStoryFormData>({
    resolver: zodResolver(ownerStorySchema),
    defaultValues: {
      owner_story_en: "",
      owner_story_ja: "",
      owner_story_vi: "",
      photo_url: "",
    }
  });

  // Load owner story data from RestaurantContext
  useEffect(() => {
    if (restaurantSettings) {
      reset({
        owner_story_en: restaurantSettings.owner_story_en || "",
        owner_story_ja: restaurantSettings.owner_story_ja || "",
        owner_story_vi: restaurantSettings.owner_story_vi || "",
        photo_url: restaurantSettings.owner_photo_url || "",
      });
      setPhotoPreview(restaurantSettings.owner_photo_url);
    }
  }, [restaurantSettings, reset]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      
      const formData = new FormData();
      formData.append('photo', file);

      // Upload to Supabase storage
      const uploadResponse = await fetch('/api/v1/upload/owner-photo', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload photo');

      const uploadData = await uploadResponse.json();
      
      // Update restaurant settings with the new photo URL
      const settingsResponse = await fetch('/api/v1/restaurant/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ owner_photo_url: uploadData.url }),
      });

      if (!settingsResponse.ok) throw new Error('Failed to save photo');

      const settingsResult = await settingsResponse.json();
      updateSettings(settingsResult); // Update the context
      
      setValue("photo_url", uploadData.url);
      setPhotoPreview(uploadData.url);
      toast.success(t('photo.uploadSuccess'));
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(t('photo.uploadError'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: OwnerStoryFormData) => {
    try {
      setIsSaving(true);
      
      // Update using the restaurant settings API
      const updateData = {
        owner_story_en: data.owner_story_en,
        owner_story_ja: data.owner_story_ja,
        owner_story_vi: data.owner_story_vi,
        // Note: photo_url is handled separately in handlePhotoUpload
      };

      const response = await fetch('/api/v1/restaurant/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to save owner story');

      const result = await response.json();
      updateSettings(result); // Update the context
      
      toast.success(t('save.success'));
      reset(data); // Reset form to mark as not dirty
    } catch (error) {
      console.error('Error saving owner story:', error);
      toast.error(t('save.error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('info.personalTouch')}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t('photo.title')}</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="relative">
                {photoPreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={photoPreview}
                      alt={t('photo.alt')}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-600">{t('photo.description')}</p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingPhoto}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        {isUploadingPhoto ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {photoPreview ? t('photo.change') : t('photo.upload')}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Story Content */}
          <div className="space-y-6">
            <Label className="text-base font-semibold">{t('story.title')}</Label>
            
            {/* English Story */}
            <div className="space-y-2">
              <Label htmlFor="story-en">{t('story.english')}</Label>
              <Textarea
                id="story-en"
                {...register("owner_story_en")}
                placeholder={t('story.placeholderEn')}
                rows={4}
                className="resize-none"
              />
              {errors.owner_story_en && (
                <p className="text-sm text-red-500">{errors.owner_story_en.message}</p>
              )}
            </div>

            {/* Japanese Story */}
            <div className="space-y-2">
              <Label htmlFor="story-ja">{t('story.japanese')}</Label>
              <Textarea
                id="story-ja"
                {...register("owner_story_ja")}
                placeholder={t('story.placeholderJa')}
                rows={4}
                className="resize-none"
              />
              {errors.owner_story_ja && (
                <p className="text-sm text-red-500">{errors.owner_story_ja.message}</p>
              )}
            </div>

            {/* Vietnamese Story */}
            <div className="space-y-2">
              <Label htmlFor="story-vi">{t('story.vietnamese')}</Label>
              <Textarea
                id="story-vi"
                {...register("owner_story_vi")}
                placeholder={t('story.placeholderVi')}
                rows={4}
                className="resize-none"
              />
              {errors.owner_story_vi && (
                <p className="text-sm text-red-500">{errors.owner_story_vi.message}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={!isDirty || isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('buttons.save')}
            </Button>
          </div>
        </form>

        {/* Tips Section */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('tips.title')}
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {t('tips.personal')}</li>
            <li>• {t('tips.authentic')}</li>
            <li>• {t('tips.passion')}</li>
            <li>• {t('tips.multilingual')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
