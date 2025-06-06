"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("auth");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/auth/two-factor/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code }),
    });

    if (!res.ok) {
      const data = await res.text();
      setError(data || t("otpInvalid"));
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.redirectUrl) {
      router.push(data.redirectUrl);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">
          {t("twoFactorTitle")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <Label htmlFor="code">{t("otpLabel")}</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCode(e.target.value)
              }
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("loggingIn") : t("verifyOtpButton")}
          </Button>
        </form>
      </div>
    </div>
  );
}
