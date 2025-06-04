"use client";

import { useSessionContext } from "@supabase/auth-helpers-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, session } = useSessionContext();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || "en"; // Default to 'en' if locale is not in params

  useEffect(() => {
    if (!isLoading && !session) {
      router.push(`/${locale}/login`);
    }
  }, [isLoading, session, router, locale]);

  if (isLoading) {
    return <div>Loading...</div>; // Replace with a proper loading indicator
  }

  if (session) {
    return <>{children}</>;
  }

  return null; // Or a fallback UI if needed before redirect
}
