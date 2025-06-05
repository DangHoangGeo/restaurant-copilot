"use client";

import { useSessionContext } from "@supabase/auth-helpers-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react"; // Assuming you're using lucide-react for icons

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, session, error } = useSessionContext();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || "en";

  useEffect(() => {
    if (!isLoading && !session) {
      // Redirect to login page with the current URL as the redirect target
      const currentPath = window.location.pathname;
      const redirectUrl = `/${locale}/login?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectUrl);
    }
  }, [isLoading, session, router, locale]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--brand-color]" />
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">Authentication error. Please try logging in again.</p>
        <button
          onClick={() => router.push(`/${locale}/login`)}
          className="text-primary hover:underline"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // If authenticated, render children
  if (session) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}
