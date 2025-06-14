"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!captchaToken) {
      setError(t("error.captchaRequired"));
      return;
    }

    if (!email) {
      setError(t("error.emailRequired"));
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: "/account/update-password",
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage(t("success.passwordReset"));
    }
  };

  return (
    <div>
      <h1>{t("title.forgotPassword")}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">{t("email")}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
          onChange={(token) => {
            setCaptchaToken(token);
            setError(null); // Clear captcha error when user interacts with ReCAPTCHA
          }}
        />
        <button type="submit" disabled={!captchaToken || !email}>
          {t("forgotPassword")}
        </button>
        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
