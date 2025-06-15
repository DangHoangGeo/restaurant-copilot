"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from 'next-intl';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/shared/schemas/signup";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthCard, FormField, PasswordInput, PolicyAgreement } from "@/components/auth";
import { PRICING_PLANS } from "@/config/pricing";

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('Common');
  const tHome = useTranslations('HomePage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [subdomainAvailability, setSubdomainAvailability] = useState<"checking" | "available" | "not-available" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    clearErrors,
    setValue
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      email: "",
      password: "",
      confirmPassword: "",
      defaultLanguage: "en",
      selectedPlan: undefined,
      captchaToken: "",
      policyAgreement: false,
    },
  });

  const subdomainValue = watch("subdomain");
  const passwordValue = watch("password");
  const confirmPasswordValue = watch("confirmPassword");
  const policyAgreementValue = watch("policyAgreement");

  const checkSubdomainAvailability = useCallback(
    async (subdomain: string) => {
      if (!subdomain) {
        setSubdomainAvailability(null);
        return;
      }

      setSubdomainAvailability("checking");
      try {
        const response = await fetch(`/api/v1/restaurant/check-subdomain?subdomain=${subdomain}`);
        const data = await response.json();
        if (data.available) {
          setSubdomainAvailability("available");
          clearErrors("subdomain");
        } else {
          setSubdomainAvailability("not-available");
          setError("subdomain", {
            type: "manual",
            message: t(`subdomainErrors.${data.reason || "not_available"}`),
          });
        }
      } catch (error) {
        console.error("Error checking subdomain availability:", error);
        setSubdomainAvailability("not-available");
        setError("subdomain", {
          type: "manual",
          message: t("subdomainErrors.check_failed"),
        });
      }
    },
    [t, setError, clearErrors]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      checkSubdomainAvailability(subdomainValue);
    }, 300); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [subdomainValue, checkSubdomainAvailability]);

  // Detect plan from URL parameters or localStorage
  useEffect(() => {
    const planFromUrl = searchParams.get('plan');
    const planFromStorage = localStorage.getItem('selectedPlan');
    
    if (planFromUrl && ['starter', 'growth', 'enterprise'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
      setValue('selectedPlan', planFromUrl as 'starter' | 'growth' | 'enterprise');
      // Save to localStorage for persistence
      localStorage.setItem('selectedPlan', planFromUrl);
    } else if (planFromStorage && ['starter', 'growth', 'enterprise'].includes(planFromStorage)) {
      setSelectedPlan(planFromStorage);
      setValue('selectedPlan', planFromStorage as 'starter' | 'growth' | 'enterprise');
    }
  }, [searchParams, setValue, setSelectedPlan]);

  const onSubmit = async (data: SignupFormInputs) => {
    setServerError(null);
    if (!captchaToken) {
      setError("captchaToken", {
        type: "manual",
        message: t("captchaRequired"),
      });
      return;
    }

    // 1. POST to /api/v1/verify-captcha
    try {
      const captchaRes = await fetch("/api/v1/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      const captchaData = await captchaRes.json();
      console.log("Captcha verification response:", captchaData);
      if (!captchaData.valid) {
        setError("captchaToken", {
          type: "manual",
          message: t("captchaInvalid"),
        });
        return;
      }
    } catch (error) {
      console.error("Captcha verification failed:", error);
      setServerError(t("captchaInvalid"));
      return;
    }

    // 2. POST to /api/v1/register
    try {
      const registerRes = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          subdomain: data.subdomain,
          email: data.email,
          password: data.password,
          defaultLanguage: data.defaultLanguage,
          selectedPlan: data.selectedPlan,
          policyAgreement: data.policyAgreement,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setServerError(registerData.error || t("registrationFailed"));
        return;
      }

      if (registerData.redirect) {
        router.push(registerData.redirect);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      setServerError(t("registrationFailed"));
    }
  };

  return (
    <AuthCard 
      title={t('title.signup')}
      description={t('subtitle.signup')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Restaurant Name */}
        <FormField
          label={t('nameLabel')}
          {...register("name")}
          error={errors.name?.message}
          placeholder={t('namePlaceholder')}
        />

        {/* Subdomain */}
        <FormField
          label={t('subdomainLabel')}
          {...register("subdomain")}
          error={errors.subdomain?.message}
          placeholder={t('subdomainPlaceholder')}
          loading={subdomainAvailability === "checking"}
          success={subdomainAvailability === "available" ? t('subdomainAvailable') : undefined}
          helpText={subdomainAvailability === "not-available" ? t('subdomainNotAvailable') : undefined}
          rightIcon={
            subdomainAvailability === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : subdomainAvailability === "available" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : subdomainAvailability === "not-available" ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : undefined
          }
        />

        {/* Email */}
        <FormField
          label={t('emailLabel')}
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder={t('emailPlaceholder')}
        />

        {/* Password */}
        <div className="space-y-2">
          <PasswordInput
            label={t("password.newPassword") || "Password"}
            {...register("password")}
            value={passwordValue}
            showStrengthIndicator={true}
            showRequirements={true}
            confirmPassword={confirmPasswordValue}
            placeholder={t("password.newPasswordPlaceholder") || "Enter your password"}
            onPasswordChange={(password) => setValue("password", password)}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <PasswordInput
            label={t("password.confirmPassword") || "Confirm Password"}
            {...register("confirmPassword")}
            value={confirmPasswordValue}
            showStrengthIndicator={false}
            showRequirements={false}
            confirmPassword={passwordValue}
            placeholder={t("password.confirmPasswordPlaceholder") || "Confirm your password"}
            onPasswordChange={(password) => setValue("confirmPassword", password)}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Default Language */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {tCommon('defaultLanguageLabel')}
          </label>
          <Select 
            value={watch("defaultLanguage")}
            onValueChange={(value) => setValue("defaultLanguage", value as "en" | "ja" | "vi")}
          >
            <SelectTrigger>
              <SelectValue placeholder={tCommon('defaultLanguagePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{tCommon('languageOption.en')}</SelectItem>
              <SelectItem value="ja">{tCommon('languageOption.ja')}</SelectItem>
              <SelectItem value="vi">{tCommon('languageOption.vi')}</SelectItem>
            </SelectContent>
          </Select>
          {errors.defaultLanguage && (
            <p className="text-sm text-red-600">{errors.defaultLanguage.message}</p>
          )}
        </div>

        {/* Selected Plan Display */}
        {selectedPlan && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Selected Plan
            </label>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    {tHome(`pricing.plans.${selectedPlan}.title`)}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ${PRICING_PLANS.find(plan => plan.id === selectedPlan)?.price.monthly}/month
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setValue('selectedPlan', undefined);
                    localStorage.removeItem('selectedPlan');
                  }}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm"
                >
                  Change Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Policy Agreement */}
        <PolicyAgreement
          checked={policyAgreementValue}
          onCheckedChange={(checked) => setValue("policyAgreement", checked)}
          error={errors.policyAgreement?.message}
        />

        {/* CAPTCHA */}
        <div className="flex flex-col items-center space-y-2">
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
            onChange={(token) => {
              setCaptchaToken(token);
              if (token) {
                clearErrors("captchaToken");
                setValue("captchaToken", token);
              }
            }}
            onExpired={() => {
              setCaptchaToken(null);
              setError("captchaToken", {
                type: "manual",
                message: t("captchaExpired"),
              });
              setValue("captchaToken", "");
            }}
          />
          {errors.captchaToken && (
            <p className="text-sm text-red-600">{errors.captchaToken.message}</p>
          )}
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{serverError}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('registering')}
            </>
          ) : (
            t('registerButton')
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
