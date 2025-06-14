"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("loginFailed"));
      }

      const data = await response.json();

      if (data.twoFactorRequired && data.token) {
        router.push(`/${locale}/auth/two-factor?token=${encodeURIComponent(data.token)}`);
      } else if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        setError(t("subdomainNotFound"));
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
            {t("title.login") || "Welcome Back"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("subtitle.login") || "Sign in to your account to continue"}
          </p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                {t("emailLabel") || "Email Address"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder") || "Enter your email"}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="mt-1 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                {t("passwordLabel") || "Password"}
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder") || "Enter your password"}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="pr-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

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
      </div>

      {/* Additional Links */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center space-x-4">
          <Link href={`/${locale}/auth/signup`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('signUp') || 'Sign Up'}
            </Button>
          </Link>
          <Link href={`/${locale}/auth/forgot-password`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              {t('forgotPassword') || 'Forgot Password'}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
