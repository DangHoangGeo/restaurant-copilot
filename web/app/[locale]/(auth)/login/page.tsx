"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";
import Link from "next/link";
import { AuthCard, FormField, PasswordInput } from "@/components/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth");
  const locale = useLocale();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!captchaToken) {
      setError(t("captchaRequired"));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      // Pending-approval / suspended: server returns 403 with a redirectUrl.
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.redirectUrl) {
          window.location.href = errorData.redirectUrl;
          return;
        }
        throw new Error(errorData.message || t("loginFailed"));
      }

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || t("loginFailed"));
        } else {
          const errorText = await response.text();
          throw new Error(errorText || t("loginFailed"));
        }
      }

      const data = await response.json();

      if (data.twoFactorRequired && data.token) {
        router.push(`/${locale}/two-factor?token=${encodeURIComponent(data.token)}`);
      } else if (data.redirectUrl) {
        // Use the redirectUrl from the API which includes the correct subdomain
        window.location.href = data.redirectUrl;
      } else {
        // Fallback to dashboard on current domain if no redirectUrl provided
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || t("anErrorOccurred"));
      } else {
        setError(t("anErrorOccurred"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      title={t("title.login") || "Welcome Back"}
      description={t("subtitle.login") || "Sign in to your account to continue"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        <FormField
          label={t("emailLabel") || "Email Address"}
          type="email"
          placeholder={t("emailPlaceholder") || "Enter your email"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftIcon={<Mail className="h-4 w-4" />}
        />
        
        <PasswordInput
          label={t("passwordLabel") || "Password"}
          placeholder={t("passwordPlaceholder") || "Enter your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          showStrengthIndicator={false}
          showRequirements={false}
        />

        <div className="flex justify-center py-2">
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
            onChange={(token) => setCaptchaToken(token)}
            onExpired={() => setCaptchaToken(null)}
            theme="light"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl" 
          disabled={loading || !captchaToken}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t("loggingIn") || "Signing In..."}
            </div>
          ) : (
            t("loginButton") || "Sign In"
          )}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center space-x-4">
          <Link href={`/${locale}/signup`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('signUp') || 'Sign Up'}
            </Button>
          </Link>
          <Link href={`/${locale}/forgot-password`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('forgotPassword') || 'Forgot Password'}
            </Button>
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
