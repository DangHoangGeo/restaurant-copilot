"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { QrCode, Shield, ShieldCheck, ShieldX, Smartphone, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const setupTwoFactorSchema = z.object({
  code: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type SetupTwoFactorFormData = z.infer<typeof setupTwoFactorSchema>;
type DisableTwoFactorFormData = z.infer<typeof disableTwoFactorSchema>;

interface TwoFactorAuthFormProps {
  currentStatus: boolean;
  onStatusChanged: (enabled: boolean) => void;
}

export function TwoFactorAuthForm({ currentStatus, onStatusChanged }: TwoFactorAuthFormProps) {
  const t = useTranslations("owner.profile");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const setupForm = useForm<SetupTwoFactorFormData>({
    resolver: zodResolver(setupTwoFactorSchema),
    defaultValues: {
      code: "",
    },
  });

  const disableForm = useForm<DisableTwoFactorFormData>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: {
      password: "",
      code: "",
    },
  });

  const handleSetupTwoFactor = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/auth/two-factor/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to setup 2FA");
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCode);
      setSecret(data.secret);
      setShowSetupForm(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async (data: SetupTwoFactorFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/auth/two-factor/verify-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify 2FA setup");
      }

      toast.success(t("twoFactor.setupSuccess"));
      onStatusChanged(true);
      setShowSetupForm(false);
      setQrCodeUrl(null);
      setSecret(null);
      setupForm.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableTwoFactor = async (data: DisableTwoFactorFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/auth/two-factor/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password,
          code: data.code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disable 2FA");
      }

      toast.success(t("twoFactor.disableSuccess"));
      onStatusChanged(false);
      setShowDisableForm(false);
      disableForm.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      toast.success(t("twoFactor.secretCopied"));
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const cancelSetup = () => {
    setShowSetupForm(false);
    setQrCodeUrl(null);
    setSecret(null);
    setupForm.reset();
  };

  const cancelDisable = () => {
    setShowDisableForm(false);
    disableForm.reset();
  };

  if (showSetupForm && qrCodeUrl && secret) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t("twoFactor.setupTitle")}
            </CardTitle>
            <CardDescription>
              {t("twoFactor.setupDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Scan QR Code */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("twoFactor.step1Title")}</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  <Image
                    src={qrCodeUrl}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                    className="rounded"
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
                  {t("twoFactor.scanInstructions")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Step 2: Manual Entry */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("twoFactor.step2Title")}</h3>
              <div className="space-y-2">
                <Label>{t("twoFactor.manualKey")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  {t("twoFactor.manualInstructions")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Step 3: Verify */}
            <form onSubmit={setupForm.handleSubmit(handleVerifySetup)} className="space-y-4">
              <h3 className="text-sm font-semibold">{t("twoFactor.step3Title")}</h3>
              <div className="space-y-2">
                <Label htmlFor="setup-code">{t("twoFactor.verificationCode")}</Label>
                <Input
                  id="setup-code"
                  {...setupForm.register("code")}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  disabled={isLoading}
                />
                {setupForm.formState.errors.code && (
                  <p className="text-sm text-red-600">
                    {setupForm.formState.errors.code.message}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {t("twoFactor.verifyInstructions")}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? t("twoFactor.enabling") : t("twoFactor.enable")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelSetup}
                  disabled={isLoading}
                >
                  {t("Common.cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showDisableForm) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {t("twoFactor.disableWarning")}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5" />
              {t("twoFactor.disableTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={disableForm.handleSubmit(handleDisableTwoFactor)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disable-password">{t("twoFactor.currentPassword")}</Label>
                <Input
                  id="disable-password"
                  type="password"
                  {...disableForm.register("password")}
                  placeholder={t("twoFactor.passwordPlaceholder")}
                  disabled={isLoading}
                />
                {disableForm.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {disableForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="disable-code">{t("twoFactor.verificationCode")}</Label>
                <Input
                  id="disable-code"
                  {...disableForm.register("code")}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  disabled={isLoading}
                />
                {disableForm.formState.errors.code && (
                  <p className="text-sm text-red-600">
                    {disableForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? t("twoFactor.disabling") : t("twoFactor.disable")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelDisable}
                  disabled={isLoading}
                >
                  {t("Common.cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStatus ? (
                <ShieldCheck className="h-8 w-8 text-green-600" />
              ) : (
                <Shield className="h-8 w-8 text-slate-400" />
              )}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t("twoFactor.title")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentStatus
                    ? t("twoFactor.enabledDescription")
                    : t("twoFactor.disabledDescription")}
                </p>
              </div>
            </div>
            <Badge variant={currentStatus ? "default" : "secondary"}>
              {currentStatus ? t("twoFactor.enabled") : t("twoFactor.disabled")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Card>
        <CardContent className="pt-6">
          {currentStatus ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("twoFactor.currentlyEnabled")}
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDisableForm(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <ShieldX className="h-4 w-4" />
                {t("twoFactor.disable")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("twoFactor.enhanceSecurity")}
                </p>
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Smartphone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{t("twoFactor.requiresApp")}</span>
                </div>
              </div>
              <Button
                onClick={handleSetupTwoFactor}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                {isLoading ? t("twoFactor.settingUp") : t("twoFactor.enable")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("twoFactor.aboutTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("twoFactor.aboutDescription")}
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("twoFactor.recommendedApps")}</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Google Authenticator</li>
              <li>• Microsoft Authenticator</li>
              <li>• Authy</li>
              <li>• 1Password</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
