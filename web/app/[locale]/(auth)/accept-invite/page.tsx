"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthCard, FormField, PasswordInput } from "@/components/auth";

// Token is passed as ?token=<hex> in the invite URL
export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");

  const token = searchParams.get("token") ?? "";

  // Form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Page state
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate the token on mount and determine if the user needs to create an account
  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      return;
    }

    async function validateToken() {
      try {
        // We use a lightweight endpoint to validate the token and learn the email
        const res = await fetch(`/api/v1/auth/accept-invite/validate?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setTokenValid(true);
          setInviteEmail(data.email ?? "");
          setInviteRole(data.role ?? "");
          setIsNewUser(data.is_new_user ?? true);
        } else {
          setTokenValid(false);
        }
      } catch {
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (isNewUser) {
      if (!name.trim()) {
        setError(t("nameRequired"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("passwordMismatch"));
        return;
      }
      if (password.length < 8) {
        setError(t("passwordTooShort"));
        return;
      }
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { token };
      if (isNewUser) {
        body.name = name;
        body.password = password;
      }

      const res = await fetch("/api/v1/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("anErrorOccurred"));
        return;
      }

      setSuccess(true);

      // Redirect to login so user can sign in with their new (or existing) account
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 2500);
    } catch {
      setError(t("anErrorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <AuthCard title={t("acceptInvite.title")}>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("acceptInvite.validating")}</p>
        </div>
      </AuthCard>
    );
  }

  if (!token || !tokenValid) {
    return (
      <AuthCard title={t("acceptInvite.title")}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-destructive">{t("acceptInvite.invalidToken")}</p>
          <p className="text-sm text-muted-foreground">{t("acceptInvite.invalidTokenDescription")}</p>
          <Link href={`/${locale}/login`}>
            <Button variant="outline" className="mt-2">{t("signIn")}</Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (success) {
    return (
      <AuthCard title={t("acceptInvite.title")}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-sm font-medium">{t("acceptInvite.successTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("acceptInvite.successDescription")}</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("acceptInvite.title")}>
      <div className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        <p>
          {t("acceptInvite.invitedAs")} <strong>{inviteEmail}</strong>
        </p>
        {inviteRole && (
          <p className="mt-1">
            {t("acceptInvite.role")}: <strong>{inviteRole.replace(/_/g, " ")}</strong>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isNewUser && (
          <>
            <FormField
              id="name"
              label={t("name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder={t("namePlaceholder")}
            />
            <PasswordInput
              id="password"
              label={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
            />
            <PasswordInput
              id="confirm-password"
              label={t("confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder={t("confirmPasswordPlaceholder")}
            />
          </>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("acceptInvite.accepting")}
            </>
          ) : isNewUser ? (
            t("acceptInvite.createAndAccept")
          ) : (
            t("acceptInvite.accept")
          )}
        </Button>

        {!isNewUser && (
          <p className="text-center text-sm text-muted-foreground">
            {t("acceptInvite.existingUserNote")}
          </p>
        )}
      </form>
    </AuthCard>
  );
}
