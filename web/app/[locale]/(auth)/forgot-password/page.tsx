"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { AuthCard, FormField } from "@/components/auth";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    if (!captchaToken) {
      setError(t("error.captchaRequired"));
      setLoading(false);
      return;
    }

    if (!email) {
      setError(t("error.emailRequired"));
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(
        email,
        {
          redirectTo: "/auth/update-password",
        }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage(t("success.passwordReset"));
      }
    } catch {
      setError(t("error.anErrorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      title={t("title.forgotPassword") || "Reset Password"}
      description={t("subtitle.forgotPassword") || "Enter your email to receive reset instructions"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 leading-snug">{error}</p>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-snug">{message}</p>
          </div>
        )}

        {!message ? (
          <>
            <FormField
              label={t("emailLabel")}
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="h-4 w-4" />}
              helpText={t("emailHelp")}
            />

            <div className="flex justify-center py-1">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
                onChange={(token) => {
                  setCaptchaToken(token);
                  setError(null);
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={!captchaToken || !email || loading}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-orange-200 dark:shadow-orange-900/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("sending")}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t("sendResetLink")}
                </div>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t("success.emailSent")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t("success.emailSentDescription")}
              </p>
            </div>
          </div>
        )}
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <Link href={`/${locale}/login`} className="font-medium hover:text-orange-500 transition-colors">
          {t("loginButton")}
        </Link>
        <span>·</span>
        <Link href={`/${locale}/signup`} className="font-medium hover:text-orange-500 transition-colors">
          {t("signUp")}
        </Link>
      </div>
    </AuthCard>
  );
}

