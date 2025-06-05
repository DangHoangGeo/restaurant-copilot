"use client";

import { useRouter, useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

function getAuthToken() {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
  if (!authCookie) return null;
  
  const token = authCookie.split('=')[1];
  if (!token) return null;

  const decoded = parseJwt(token);
  if (!decoded || Date.now() >= decoded.exp * 1000) return null;
  
  return token;
}

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string || "en";
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = () => {
      if (!mounted) return;

      const token = getAuthToken();
      if (token) {
        setIsAuthed(true);
        setIsChecking(false);
      } else if (!pathname.endsWith('/login')) {
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        const loginUrl = `/${locale}/login${currentUrl ? `?redirect=${encodeURIComponent(currentUrl)}` : ''}`;
        router.replace(loginUrl);
      } else {
        setIsChecking(false);
      }
    };

    // Initial check
    checkAuth();

    // Set up interval to periodically check token expiration
    const interval = setInterval(checkAuth, 60000); // Check every minute

    // Clean up
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router, pathname, searchParams, locale]);

  // Show loading state
  if (isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authenticated content
  if (isAuthed) {
    return children;
  }

  // Return null while redirecting
  return null;
}
