"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/shared/schemas/signup";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthCard, FormField, PasswordInput, PolicyAgreement } from "@/components/auth";
import { PRICING_PLANS } from "@/config/pricing";
import { cn } from "@/lib/utils";

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [subdomainAvailability, setSubdomainAvailability] = useState<
    "checking" | "available" | "not-available" | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
    clearErrors,
    setValue,
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      email: "",
      password: "",
      confirmPassword: "",
      defaultLanguage: "en",
      selectedPlan: "starter",
      selectedBillingCycle: "monthly",
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
        const response = await fetch(
          `/api/v1/restaurant/check-subdomain?subdomain=${subdomain}`
        );
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
        toast.error("Could not check subdomain availability — please try again");
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
    }, 300);
    return () => clearTimeout(handler);
  }, [subdomainValue, checkSubdomainAvailability]);

  useEffect(() => {
    const queryPlan = searchParams.get("plan");
    const queryBilling = searchParams.get("billing");
    const savedPlan = window.localStorage.getItem("selectedPlan");
    const savedBilling = window.localStorage.getItem("selectedBillingCycle");
    const plan = queryPlan || savedPlan || "starter";
    const billingCycle = queryBilling || savedBilling || "monthly";

    if (plan === "starter" || plan === "growth" || plan === "enterprise") {
      setValue("selectedPlan", plan);
    }
    if (billingCycle === "monthly" || billingCycle === "yearly") {
      setValue("selectedBillingCycle", billingCycle);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: SignupFormInputs) => {
    setServerError(null);

    if (subdomainAvailability === "checking") {
      toast.error("Still checking subdomain availability — please wait a moment");
      return;
    }
    if (subdomainAvailability !== "available") {
      toast.error("Please choose an available subdomain before continuing");
      return;
    }
    if (!captchaToken) {
      setError("captchaToken", {
        type: "manual",
        message: t("captchaRequired"),
      });
      return;
    }

    try {
      const captchaRes = await fetch("/api/v1/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      const captchaData = await captchaRes.json();
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
          selectedBillingCycle: data.selectedBillingCycle,
          policyAgreement: data.policyAgreement,
          captchaToken,
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

  const selectedPlan = watch("selectedPlan") || "starter";
  const selectedBillingCycle = watch("selectedBillingCycle") || "monthly";
  const selectedPlanConfig = PRICING_PLANS.find((p) => p.id === selectedPlan);
  const selectedPrice =
    selectedBillingCycle === "yearly"
      ? selectedPlanConfig?.price.yearly
      : selectedPlanConfig?.price.monthly;

  return (
    <AuthCard
      title={t("signup.title")}
      description={t("signup.description")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Company name */}
        <FormField
          label={t("signup.companyNameLabel")}
          {...register("name")}
          error={errors.name?.message}
          placeholder={t("signup.companyNamePlaceholder")}
        />

        {/* Subdomain */}
        <FormField
          label={t("signup.companySubdomainLabel")}
          {...register("subdomain")}
          error={errors.subdomain?.message}
          placeholder={t("signup.companySubdomainPlaceholder")}
          loading={subdomainAvailability === "checking"}
          success={
            subdomainAvailability === "available"
              ? t("subdomainAvailable")
              : undefined
          }
          helpText={
            subdomainAvailability === "not-available"
              ? t("subdomainNotAvailable")
              : undefined
          }
          rightIcon={
            subdomainAvailability === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : subdomainAvailability === "available" ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : subdomainAvailability === "not-available" ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : undefined
          }
        />

        {/* Email */}
        <FormField
          label={t("emailLabel")}
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder={t("emailPlaceholder")}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <PasswordInput
            label={t("password.newPassword")}
            {...register("password")}
            value={passwordValue}
            showStrengthIndicator={true}
            showRequirements={true}
            confirmPassword={confirmPasswordValue}
            placeholder={t("password.newPasswordPlaceholder")}
            onPasswordChange={(password) => setValue("password", password)}
          />
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <PasswordInput
            label={t("password.confirmPassword")}
            {...register("confirmPassword")}
            value={confirmPasswordValue}
            showStrengthIndicator={false}
            showRequirements={false}
            confirmPassword={passwordValue}
            placeholder={t("password.confirmPasswordPlaceholder")}
            onPasswordChange={(password) => setValue("confirmPassword", password)}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Plan selector — visual cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("signup.planLabel")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRICING_PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const price =
                selectedBillingCycle === "yearly"
                  ? plan.price.yearly
                  : plan.price.monthly;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() =>
                    setValue(
                      "selectedPlan",
                      plan.id as "starter" | "growth" | "enterprise"
                    )
                  }
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all duration-150",
                    isSelected
                      ? "border-[#AB6E3C] bg-[#FAF3EA] dark:bg-[#2A1810] shadow-sm"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isSelected
                        ? "text-[#AB6E3C] dark:text-[#D4945A]"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {plan.name}
                  </span>
                  {price != null && (
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected
                          ? "text-[#8B5A2B] dark:text-[#AB6E3C]"
                          : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      ${price}/mo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Billing cycle toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("signup.billingCycleLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setValue("selectedBillingCycle", cycle)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                  selectedBillingCycle === cycle
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-[#AB6E3C] dark:text-[#D4945A] shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                {cycle === "monthly" ? t("signup.billingMonthly") : t("signup.billingYearly")}
                {cycle === "yearly" && (
                  <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Save
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl border border-[#AB6E3C]/20 dark:border-[#AB6E3C]/30 bg-[#FAF3EA] dark:bg-[#2A1810]/40 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
              {selectedPlanConfig?.name ?? t("signup.planLabel")}
            </p>
            {selectedPrice != null && (
              <p className="text-sm font-bold text-[#AB6E3C] dark:text-[#D4945A]">
                ${selectedPrice}
                <span className="text-xs font-normal text-[#8B5A2B] dark:text-[#AB6E3C] ml-0.5">/mo</span>
              </p>
            )}
          </div>
          <p className="mt-0.5 text-xs text-orange-700 dark:text-orange-400">
            {selectedBillingCycle === "yearly"
              ? t("signup.yearlyBilling")
              : t("signup.monthlyBilling")}
          </p>
          <p className="mt-2 text-xs text-orange-600/80 dark:text-orange-400/70 leading-relaxed">
            {t("signup.planSelectedNote")}
          </p>
        </div>

        {/* Default language */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {tCommon("defaultLanguageLabel")}
          </label>
          <Select
            value={watch("defaultLanguage")}
            onValueChange={(value) =>
              setValue("defaultLanguage", value as "en" | "ja" | "vi")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={tCommon("defaultLanguagePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{tCommon("languageOption.en")}</SelectItem>
              <SelectItem value="ja">{tCommon("languageOption.ja")}</SelectItem>
              <SelectItem value="vi">{tCommon("languageOption.vi")}</SelectItem>
            </SelectContent>
          </Select>
          {errors.defaultLanguage && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.defaultLanguage.message}
            </p>
          )}
        </div>

        {/* Policy agreement */}
        <PolicyAgreement
          checked={policyAgreementValue}
          onCheckedChange={(checked) => setValue("policyAgreement", checked)}
          error={errors.policyAgreement?.message}
        />

        {/* CAPTCHA */}
        <div className="flex flex-col items-center gap-2 py-1">
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
            <p className="text-xs text-red-600 dark:text-red-400">{errors.captchaToken.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 leading-snug">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-full text-white font-semibold text-xs tracking-widest uppercase transition-all duration-200 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)", boxShadow: "0 4px 16px rgba(171,110,60,0.28)" }}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("registering")}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {t("registerButton")}
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>

        {/* Login link */}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          {t("navigation.login")
            .split("?")
            .map((part, i) =>
              i === 0 ? (
                <span key={i}>{part}? </span>
              ) : (
                <a
                  key={i}
                  href={`/${watch("defaultLanguage") || "en"}/login`}
                  className="font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {part.trim()}
                </a>
              )
            )}
        </div>
      </form>
    </AuthCard>
  );
}
