"use client";

import { createContext, useContext } from "react";

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
 * Provides a client-side auth context pre-populated from server-fetched data.
 * Primary authentication protection is handled by middleware.ts and the server
 * component in dashboard/layout.tsx — this component receives the already-
 * validated user via `initialUser` and makes it available via useAuth().
 *
 * No client-side session fetch is performed; the server data is used directly,
 * eliminating the blocking spinner and the extra round-trip to /api/v1/auth/session.
 */
export function ProtectedLayout({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  const authValue: AuthContextType = {
    user: initialUser ?? null,
    isLoading: false,
    error: null,
    refetch: async () => {
      // No-op: re-validation requires a page reload (server re-runs auth checks).
    },
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
