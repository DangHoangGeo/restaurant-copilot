"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

// User context type
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId: string;
  subdomain: string;
  restaurant?: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl?: string;
    brandColor?: string;
    defaultLanguage?: string;
    onboarded?: boolean;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a ProtectedLayout');
  }
  return context;
}

/**
 * ProtectedLayout Component
 * 
 * This component provides client-side authentication context for dashboard pages.
 * 
 * IMPORTANT: Primary authentication protection is handled by middleware.ts which
 * redirects unauthenticated users away from /dashboard/* paths before they reach
 * React components. This component serves as:
 * 
 * 1. A fallback protection layer for edge cases
 * 2. A provider for user context throughout the dashboard
 * 3. A loading/error state handler for authentication API calls
 * 
 * The middleware.ts file is the primary gatekeeper for route protection.
 */
export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const checkSession = async () => {
    try {
      setError(null);
      const res = await fetch('/api/v1/auth/session', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        if (res.status === 401) {
          // Unauthorized - clear any stale data
          setError(null);
        } else {
          setError('Failed to validate session');
        }
      }
    } catch (err) {
      console.error('Exception in checkSession:', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Session check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await checkSession();
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !error) {
      // NOTE: This redirect is redundant with middleware.ts protection
      // The middleware already handles redirecting unauthenticated users from /dashboard/* paths
      // This client-side redirect serves as a fallback for edge cases where middleware didn't catch it
      const locale = pathname.split('/')[1] || 'en';
      router.push(`/${locale}/login`);
    }
  }, [isLoading, user, error, router, pathname]);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-2">Authentication Error</div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Provide auth context to children
  const authValue: AuthContextType = {
    user,
    isLoading,
    error,
    refetch,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
