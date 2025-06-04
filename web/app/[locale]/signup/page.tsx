"use client";

import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {useTranslations} from 'next-intl';

export default function SignupPage() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const t = useTranslations('HomePage');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic here, including captchaToken
    console.log("Captcha Token:", captchaToken);
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        {/* Other form fields would go here */}
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!}
          onChange={(token) => setCaptchaToken(token)}
        />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
