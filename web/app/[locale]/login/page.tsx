"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
//import { getUserFromRequest } from "@/lib/server/getUserFromRequest";

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("loginFailed"));
      }

      const data = await response.json();

      if (data.twoFactorRequired && data.token) {
        router.push(`/${locale}/two-factor?token=${encodeURIComponent(data.token)}`);
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">{t("title.login")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-center">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loggingIn") : t("loginButton")}
          </Button>
        </form>
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <div className="text-center text-sm">
          {t("noAccount")}{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            {t("signUp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
