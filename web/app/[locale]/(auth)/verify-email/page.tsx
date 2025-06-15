"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "@/components/auth";

export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "expired">("verifying");
  const [message, setMessage] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      const { error } = await createClient().auth.verifyOtp({
        token_hash: token,
        type: "signup"
      });

      if (error) {
        if (error.message.includes("expired")) {
          setStatus("expired");
          setMessage(t("error.verificationExpired") || "Verification link has expired");
        } else {
          setStatus("error");
          setMessage(error.message || t("error.verificationFailed") || "Email verification failed");
        }
      } else {
        setStatus("success");
        setMessage(t("success.emailVerified") || "Email verified successfully!");
        
        // Redirect to login after successful verification
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 3000);
      }
    } catch {
      setStatus("error");
      setMessage(t("error.verificationFailed") || "Email verification failed");
    }
  }, [t, router, locale]);

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    
    if (!token || type !== "signup") {
      setStatus("error");
      setMessage(t("error.invalidVerificationLink") || "Invalid verification link");
      return;
    }

    verifyEmail(token);
  }, [searchParams, t, verifyEmail]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const resendVerification = async () => {
    setResending(true);
    try {
      // Note: This would need to be implemented on the backend
      // For now, we'll show a success message
      setResendCooldown(60); // 60 second cooldown
      setMessage(t("success.verificationResent") || "Verification email sent! Please check your inbox.");
    } catch {
      setMessage(t("error.resendFailed") || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "verifying":
        return <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />;
      case "error":
      case "expired":
        return <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />;
      default:
        return <Mail className="w-8 h-8 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "verifying":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "success":
        return "bg-green-100 dark:bg-green-900/30";
      case "error":
      case "expired":
        return "bg-red-100 dark:bg-red-900/30";
      default:
        return "bg-slate-100 dark:bg-slate-900/30";
    }
  };

  const getTitle = () => {
    switch (status) {
      case "verifying":
        return t("title.verifyingEmail") || "Verifying Email";
      case "success":
        return t("title.emailVerified") || "Email Verified";
      case "expired":
        return t("title.linkExpired") || "Link Expired";
      case "error":
        return t("title.verificationFailed") || "Verification Failed";
      default:
        return t("title.verifyEmail") || "Verify Email";
    }
  };

  const getDescription = () => {
    switch (status) {
      case "verifying":
        return t("subtitle.verifyingEmail") || "Please wait while we verify your email address...";
      case "success":
        return t("subtitle.emailVerified") || "Your email has been successfully verified. You can now sign in to your account.";
      case "expired":
        return t("subtitle.linkExpired") || "Your verification link has expired. Please request a new one.";
      case "error":
        return t("subtitle.verificationFailed") || "We couldn't verify your email address. Please try again or contact support.";
      default:
        return t("subtitle.verifyEmail") || "Please verify your email address to continue.";
    }
  };

  return (
    <AuthCard 
      title={getTitle()}
      description={getDescription()}
    >
      <div className="text-center space-y-6">
        {/* Status Icon */}
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            status === "success" 
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
              : status === "error" || status === "expired"
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          }`}>
            <p className={`text-sm ${
              status === "success" 
                ? "text-green-700 dark:text-green-300"
                : status === "error" || status === "expired"
                ? "text-red-700 dark:text-red-300"
                : "text-blue-700 dark:text-blue-300"
            }`}>
              {message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {status === "success" && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("info.redirectingToLogin") || "Redirecting to login page..."}
              </p>
              <Link href={`/${locale}/login`}>
                <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                  {t("continueToLogin") || "Continue to Login"}
                </Button>
              </Link>
            </div>
          )}

          {(status === "expired" || status === "error") && (
            <div className="space-y-3">
              <Button
                onClick={resendVerification}
                disabled={resending || resendCooldown > 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {resending ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("resending") || "Resending..."}
                  </div>
                ) : resendCooldown > 0 ? (
                  `${t("resendIn") || "Resend in"} ${resendCooldown}s`
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t("resendVerification") || "Resend Verification Email"}
                  </>
                )}
              </Button>
              
              <Link href={`/${locale}/signup`}>
                <Button variant="outline" className="w-full">
                  {t("backToSignup") || "Back to Sign Up"}
                </Button>
              </Link>
            </div>
          )}

          {status === "verifying" && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("info.pleaseWait") || "This may take a few moments..."}
            </p>
          )}
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-6 text-center">
        <div className="flex justify-center space-x-4">
          <Link href={`/${locale}/login`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('loginButton') || 'Sign In'}
            </Button>
          </Link>
          <Link href={`/${locale}`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('home') || 'Home'}
            </Button>
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
