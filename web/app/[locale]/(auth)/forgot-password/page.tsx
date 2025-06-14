"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
    <>
      {/* Card */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Image
              src="/coorder-ai.png"
              alt="CoOrder.ai"
              width={32}
              height={32}
              className="w-8 h-8 filter brightness-0 invert"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("title.forgotPassword") || "Reset Password"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("subtitle.forgotPassword") || "Enter your email to receive reset instructions"}
          </p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
            </div>
          )}

          {!message ? (
            <>
              <div>
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  {t("email") || "Email Address"}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder") || "Enter your email address"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("emailHelp") || "We'll send password reset instructions to this email"}
                </p>
              </div>

              <div className="flex justify-center py-2">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
                  onChange={(token) => {
                    setCaptchaToken(token);
                    setError(null);
                  }}
                  theme="light"
                />
              </div>

              <Button 
                type="submit" 
                disabled={!captchaToken || !email || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t("sending") || "Sending..."}
                  </div>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t("forgotPassword") || "Send Reset Link"}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t("success.emailSent") || "Check your email"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("success.emailSentDescription") || "If an account with that email exists, we've sent you a password reset link."}
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Additional Links */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center space-x-4">
          <Link href={`/${locale}/auth/login`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('loginButton') || 'Sign In'}
            </Button>
          </Link>
          <Link href={`/${locale}/auth/signup`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('signUp') || 'Sign Up'}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

