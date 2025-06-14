"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Shield } from "lucide-react";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          console.error("Error checking session:", sessionError.message);
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
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch {
      setError(t("error.anErrorOccurred"));
    } finally {
      setLoading(false);
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

          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">
                {t("password.newPassword") || "New Password"}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
      )}
    </div>
  );
}
