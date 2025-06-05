"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle forgot password logic here, including captchaToken
    console.log("Captcha Token:", captchaToken);
  };

  return (
    <div>
      <h1>{t("title.forgotPassword")}</h1>
      <form onSubmit={handleSubmit}>
        {/* Other form fields would go here (e.g., email input) */}
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
          onChange={(token) => setCaptchaToken(token)}
        />
        <button type="submit">{t("forgotPassword")}</button>
      </form>
    </div>
  );
}
