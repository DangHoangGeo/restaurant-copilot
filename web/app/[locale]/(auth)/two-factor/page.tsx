"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { AuthCard, FormField } from "@/components/auth";
import { Shield, AlertCircle } from "lucide-react";

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
    <AuthCard 
      title={t("title.twoFactor") || "Two-Factor Authentication"}
      description={t("subtitle.twoFactor") || "Enter the verification code from your authenticator app"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        <FormField
          label={t("otpLabel") || "Verification Code"}
          type="text"
          placeholder={t("otpPlaceholder") || "Enter 6-digit code"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          leftIcon={<Shield className="h-4 w-4" />}
          helpText={t("otpHelp") || "Enter the 6-digit code from your authenticator app"}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t("verifying") || "Verifying..."}
            </div>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              {t("verifyOtpButton") || "Verify Code"}
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
