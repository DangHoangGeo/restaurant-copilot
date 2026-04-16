"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientLogger } from "@/lib/client-logger";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import { AuthCard, PasswordInput } from "@/components/auth";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await createClient().auth.getSession();
        if (sessionError) {
          // Log session check error for debugging
          await clientLogger.error('update-password', 'Error checking session', {
            error: sessionError.message
          });
          setError(t("error.sessionCheck"));
          setUserAuthenticated(false);
        } else if (!session) {
          setUserAuthenticated(false);
          setError(t("error.notAuthenticatedUpdate"));
        } else {
          setUserAuthenticated(true);
        }
      } catch {
        setUserAuthenticated(false);
        setError(t("error.sessionCheck"));
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!userAuthenticated) {
      setError(t("error.notAuthenticatedUpdate"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("error.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("error.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage(t("success.passwordUpdated"));
        setNewPassword("");
        setConfirmPassword("");
        // Optionally redirect after success
        // TODO: check if authenticated user is still valid, then redirect to account page
        // if not, redirect to login
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      }
    } catch {
      setError(t("error.anErrorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div >
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-600 dark:text-slate-400">
              {t("messages.loading") || "Loading..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!userAuthenticated ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <p className="text-slate-600 dark:text-slate-400">
            {t("info.signInToUpdatePassword") || "You need to be signed in to update your password."}
          </p>
        </div>
      ) : (
        <AuthCard 
          title={t("title.updatePassword") || "Update Password"}
          description={t("subtitle.updatePassword") || "Enter your new password"}
        >
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

            <PasswordInput
              label={t("password.newPassword") || "New Password"}
              placeholder={t("password.newPasswordPlaceholder") || "Enter your new password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              showStrengthIndicator={true}
              showRequirements={true}
              confirmPassword={confirmPassword}
            />

            <PasswordInput
              label={t("password.confirmPassword") || "Confirm Password"}
              placeholder={t("password.confirmPasswordPlaceholder") || "Confirm your new password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              showStrengthIndicator={false}
              showRequirements={false}
              confirmPassword={newPassword}
            />

            <Button 
              type="submit" 
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t("password.updating") || "Updating..."}
                </div>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  {t("password.update") || "Update Password"}
                </>
              )}
            </Button>
          </form>
        </AuthCard>
      )}
    </div>
  );
}
