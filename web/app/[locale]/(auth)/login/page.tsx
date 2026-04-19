"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail, ArrowRight } from "lucide-react";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });

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
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/${locale}/control`);
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
      title={t("title.login")}
      description={t("subtitle.login")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 leading-snug">{error}</p>
          </div>
        )}

        <FormField
          label={t("emailLabel")}
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <PasswordInput
          label={t("passwordLabel")}
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          showStrengthIndicator={false}
          showRequirements={false}
        />

        <div className="flex justify-end -mt-2">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <div className="flex justify-center py-1">
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
            onChange={(token) => setCaptchaToken(token)}
            onExpired={() => setCaptchaToken(null)}
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-orange-200 dark:shadow-orange-900/30 hover:shadow-lg hover:shadow-orange-200 dark:hover:shadow-orange-900/40 disabled:opacity-50"
          disabled={loading || !captchaToken}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("loggingIn")}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {t("loginButton")}
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>

      {/* Footer links */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        {t("noAccount")}
        <Link
          href={`/${locale}/signup`}
          className="font-semibold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors ml-1"
        >
          {t("signUp")}
        </Link>
      </div>
    </AuthCard>
  );
}
