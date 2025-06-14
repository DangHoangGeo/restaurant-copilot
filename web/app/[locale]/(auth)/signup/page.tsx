"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from 'next-intl';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/shared/schemas/signup";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [subdomainAvailability, setSubdomainAvailability] = useState<"checking" | "available" | "not-available" | null>(null);

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
      captchaToken: "",
    },
  });

  const subdomainValue = watch("subdomain");

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

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ["veryWeak", "weak", "medium", "strong", "veryStrong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];


  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('title.signup')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              {t('nameLabel')}
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-foreground">
              {t('subdomainLabel')}
            </label>
            <input
              id="subdomain"
              type="text"
              {...register("subdomain")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {subdomainValue && subdomainAvailability === "checking" && (
              <p className="mt-1 text-sm text-gray-500">{t('subdomainChecking')}</p>
            )}
            {subdomainValue && subdomainAvailability === "available" && (
              <p className="mt-1 text-sm text-green-600">{t('subdomainAvailable')}</p>
            )}
            {subdomainValue && subdomainAvailability === "not-available" && (
              <p className="mt-1 text-sm text-red-600">{t('subdomainNotAvailable')}</p>
            )}
            {errors.subdomain && <p className="mt-1 text-sm text-red-600">{errors.subdomain.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t('emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                {t("password.newPassword") || "Password"}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  id="password"
                  {...register("password", {
                    onChange: (e) => setNewPassword(e.target.value)
                  })}
                  required
                  minLength={6}
                  placeholder={t("password.newPasswordPlaceholder") || "Enter your new password"}
                  className="pl-10 pr-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength ? strengthColors[passwordStrength - 1] : "bg-slate-200 dark:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("password.passwordStrength") || "Password Strength: "}{t(`password.strength.${strengthLabels[passwordStrength - 1]}`) || "Very Weak"}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                {t("password.confirmPassword") || "Confirm Password"}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  {...register("confirmPassword", {
                    onChange: (e) => setConfirmPassword(e.target.value)
                  })}
                  required
                  minLength={6}
                  placeholder={t("password.confirmPasswordPlaceholder") || "Confirm your new password"}
                  className="pl-10 pr-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-1">
                  {newPassword === confirmPassword ? (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t("password.passwordMatch") || "Passwords match!"}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t("password.passwordMismatch") || "Passwords do not match"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("password.requirements") || "Password Requirements:"}
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`} />
                {t("password.minLength") || "At least 8 characters long"}
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                {t("password.uppercase") || "Contains uppercase letter"}
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                {t("password.lowercase") || "Contains lowercase letter"}
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                {t("password.number") || "Contains number"}
              </li>
            </ul>
          </div>

          <div>
            <label htmlFor="defaultLanguage" className="block text-sm font-medium text-foreground">
              {tCommon('defaultLanguageLabel')}
            </label>
            <select
              id="defaultLanguage"
              {...register("defaultLanguage")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="en">{tCommon('languageOption.en')}</option>
              <option value="ja">{tCommon('languageOption.ja')}</option>
              <option value="vi">{tCommon('languageOption.vi')}</option>
            </select>
            {errors.defaultLanguage && <p className="mt-1 text-sm text-red-600">{errors.defaultLanguage.message}</p>}
          </div>

          <div className="flex flex-col items-center">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
              onChange={(token) => {
                setCaptchaToken(token);
                if (token) {
                  clearErrors("captchaToken");
                  // Add this line:
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
            {errors.captchaToken && <p className="mt-1 text-sm text-red-600">{errors.captchaToken.message}</p>}
          </div>

          {serverError && (
            <p className="mt-4 text-sm text-red-600 text-center">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? t('registering') : t('registerButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
