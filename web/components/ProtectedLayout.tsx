"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
// Or, if using next-intl for navigation:
// import { useRouter } from '@/i18n/navigation';


export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/v1/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('Exception in checkSession:', e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // If loading is complete and user is not authenticated, redirect to login.
      // Ensure you have a login page route, e.g., '/login' or locale-specific.
      // This assumes your login page is at the root '/login'. Adjust if it's namespaced by locale.
      // Derive locale from the current pathname to redirect correctly
      const locale = pathname.split('/')[1] || 'en';
      router.push(`/${locale}/login`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This state might be briefly visible before redirection or if redirection fails.
    // Or, you can return null or a different loader while redirecting.
    // For instance, if router.replace is asynchronous or takes a moment.
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show authenticated content
  return <>{children}</>; // Use React.Fragment shorthand if preferred
}
