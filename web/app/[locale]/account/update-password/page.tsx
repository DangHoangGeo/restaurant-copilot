"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"; // For potential redirection

export default function UpdatePasswordPage() {
  const t = useTranslations("auth"); // Assuming you have translations for this page
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error checking session:", sessionError.message);
        setError(t("error.sessionCheck"));
        setUserAuthenticated(false);
      } else if (!session) {
        // setError(t("error.notAuthenticatedUpdate")); // Or redirect
        // router.push("/login"); // Example redirect
        setUserAuthenticated(false);
        setError(t("error.notAuthenticatedUpdate"));
      } else {
        setUserAuthenticated(true);
      }
      setCheckingAuth(false);
    };

    checkSession();
  }, [t, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!userAuthenticated) {
      setError(t("error.notAuthenticatedUpdate"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("error.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) { // Example: Enforce minimum password length
      setError(t("error.passwordTooShort"));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(t("success.passwordUpdated"));
      setNewPassword("");
      setConfirmPassword("");
      // Optionally redirect to account page or login
      // router.push("/account");
    }
  };

  if (checkingAuth) {
    return <p>{t("messages.loading")}</p>; // Or a loading spinner
  }

  return (
    <div>
      <h1>{t("title.updatePassword")}</h1>
      {!userAuthenticated && error && <p style={{ color: "red" }}>{error}</p>}
      {userAuthenticated ? (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="newPassword">{t("newPassword")}</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? t("messages.loading") : t("updatePassword")}
          </button>
          {message && <p style={{ color: "green" }}>{message}</p>}
          {error && !message && <p style={{ color: "red" }}>{error}</p>}
        </form>
      ) : (
        <p>{t("info.signInToUpdatePassword")}</p>
        // Or a link to the login page: <Link href="/login">{t("login")}</Link>
      )}
    </div>
  );
}
