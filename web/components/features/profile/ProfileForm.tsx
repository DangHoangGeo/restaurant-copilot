"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurant_id: string;
  two_factor_enabled: boolean;
  created_at: string;
}

interface Restaurant {
  id: string;
  name: string;
  subdomain: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

interface ProfileFormProps {
  userProfile: UserProfile;
  restaurant: Restaurant;
  onUpdate: (updatedProfile: Partial<UserProfile>) => void;
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm({ userProfile, restaurant, onUpdate }: ProfileFormProps) {
  const t = useTranslations("owner.profile");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile.name || "",
      email: userProfile.email,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setShowSuccess(false);
    
    try {
      // Update user profile via API
      const response = await fetch("/api/v1/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      // Update email if changed (using Supabase auth directly for email updates)
      if (data.email !== userProfile.email) {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        });

        if (authError) {
          throw new Error(authError.message);
        }
      }

      // Update local state
      onUpdate({
        name: data.name,
        email: data.email,
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset form dirty state
      reset(data);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {showSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("profileInfo.updateSuccess")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t("profileInfo.name")}</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder={t("profileInfo.namePlaceholder")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{t("profileInfo.email")}</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder={t("profileInfo.emailPlaceholder")}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email.message}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {t("profileInfo.emailChangeNote")}
          </p>
        </div>
      </div>

      {/* Restaurant Information (Read-only) */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t("profileInfo.restaurantInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t("profileInfo.restaurantName")}</Label>
            <Input value={restaurant.name} disabled className="bg-slate-50 dark:bg-slate-800" />
          </div>
          <div className="space-y-2">
            <Label>{t("profileInfo.subdomain")}</Label>
            <Input 
              value={`${restaurant.subdomain}.coorder.ai`} 
              disabled 
              className="bg-slate-50 dark:bg-slate-800" 
            />
          </div>
          {restaurant.email && (
            <div className="space-y-2">
              <Label>{t("profileInfo.restaurantEmail")}</Label>
              <Input 
                value={restaurant.email} 
                disabled 
                className="bg-slate-50 dark:bg-slate-800" 
              />
            </div>
          )}
          {restaurant.phone && (
            <div className="space-y-2">
              <Label>{t("profileInfo.restaurantPhone")}</Label>
              <Input 
                value={restaurant.phone} 
                disabled 
                className="bg-slate-50 dark:bg-slate-800" 
              />
            </div>
          )}
        </div>
        {restaurant.address && (
          <div className="space-y-2 mt-4">
            <Label>{t("profileInfo.restaurantAddress")}</Label>
            <Textarea 
              value={restaurant.address} 
              disabled 
              className="bg-slate-50 dark:bg-slate-800" 
            />
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t("profileInfo.accountInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t("profileInfo.role")}</Label>
            <Input 
              value={t(`profileInfo.roles.${userProfile.role}`)} 
              disabled 
              className="bg-slate-50 dark:bg-slate-800" 
            />
          </div>
          <div className="space-y-2">
            <Label>{t("profileInfo.memberSince")}</Label>
            <Input 
              value={new Date(userProfile.created_at).toLocaleDateString()} 
              disabled 
              className="bg-slate-50 dark:bg-slate-800" 
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting || !isDirty}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {tCommon("saveChanges")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
