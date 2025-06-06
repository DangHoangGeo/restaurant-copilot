"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client"; // Import client-side Supabase
import { useRouter } from "next/navigation"; // For client-side navigation
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

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error.message);
          setIsAuthenticated(false);
        } else if (!session) {
          setIsAuthenticated(false);
        } else {
          // Session exists, user is authenticated
          // You could add further checks here, e.g., token expiry, user roles, etc.
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Exception in checkSession:", e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []); // Run once on mount

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // If loading is complete and user is not authenticated, redirect to login.
      // Ensure you have a login page route, e.g., '/login' or locale-specific.
      // This assumes your login page is at the root '/login'. Adjust if it's namespaced by locale.
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

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
