"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function ForgotPasswordPage() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle forgot password logic here, including captchaToken
    console.log("Captcha Token:", captchaToken);
  };

  return (
    <div>
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit}>
        {/* Other form fields would go here (e.g., email input) */}
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
          onChange={(token) => setCaptchaToken(token)}
        />
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
}
