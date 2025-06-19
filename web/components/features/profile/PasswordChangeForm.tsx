"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth";
import { Loader2, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PasswordChangeFormProps {
  onPasswordChanged: () => void;
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

export function PasswordChangeForm({ onPasswordChanged }: PasswordChangeFormProps) {
  const t = useTranslations("owner.profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  const onSubmit = async (data: PasswordChangeData) => {
    setIsSubmitting(true);
    setShowSuccess(false);
    
    try {
      // Change password via API
      const response = await fetch("/api/v1/user/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      // Success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      reset();
      onPasswordChanged();
      
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
            {t("security.passwordChangeSuccess")}
          </p>
        </div>
      )}

      {/* Current Password */}
      <div className="space-y-2">
        <PasswordInput
          label={t("security.currentPassword")}
          placeholder={t("security.currentPasswordPlaceholder")}
          {...register("currentPassword")}
          showStrengthIndicator={false}
          showRequirements={false}
          disabled={isSubmitting}
        />
        {errors.currentPassword && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <PasswordInput
          label={t("security.newPassword")}
          placeholder={t("security.newPasswordPlaceholder")}
          {...register("newPassword")}
          value={newPassword}
          showStrengthIndicator={true}
          showRequirements={true}
          confirmPassword={confirmPassword}
          disabled={isSubmitting}
        />
        {errors.newPassword && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.newPassword.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <PasswordInput
          label={t("security.confirmPassword")}
          placeholder={t("security.confirmPasswordPlaceholder")}
          {...register("confirmPassword")}
          value={confirmPassword}
          showStrengthIndicator={false}
          showRequirements={false}
          confirmPassword={newPassword}
          disabled={isSubmitting}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          {t("security.passwordTips.title")}
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• {t("security.passwordTips.tip1")}</li>
          <li>• {t("security.passwordTips.tip2")}</li>
          <li>• {t("security.passwordTips.tip3")}</li>
          <li>• {t("security.passwordTips.tip4")}</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("security.changingPassword")}
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              {t("security.changePassword")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
