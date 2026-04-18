"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { RestaurantSettings } from "@/shared/types/customer";

interface SessionParams {
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  code?: string;
  branch?: string;
  table?: string;
}

interface SessionData {
  sessionId: string | null;
  sessionStatus: "new" | "join" | "active" | "invalid" | "expired";
  canAddItems: boolean;
  orderId?: string;
  tableNumber?: string;
  guestCount?: number;
  pendingSessionId?: string;
  requirePasscode?: boolean;
}

interface CustomerDataContextType {
  restaurantSettings: RestaurantSettings | null;
  sessionParams: SessionParams;
  activeBranchCode: string | null;
  sessionData: SessionData;
  isLoading: boolean;
  error: string | null;
  // Session management functions
  checkStoredSession: () => Promise<void>;
  checkStoredSessionForDirectAccess: () => Promise<void>;
  setSessionId: (sessionId: string) => void;
  clearSession: () => void;
}

const CustomerDataContext = createContext<CustomerDataContextType | null>(null);

// ─── Session storage helpers (restaurant-scoped + 12-hour expiry) ────────────

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sessionKey(restaurantId: string): string {
  return `coorder_session_${restaurantId}`;
}

function readStoredSession(restaurantId: string): string | null {
  try {
    const raw = localStorage.getItem(sessionKey(restaurantId));
    if (!raw) return null;

    let sessionId: string;
    let expiresAt: number | undefined;
    try {
      const parsed = JSON.parse(raw);
      sessionId = parsed.sessionId;
      expiresAt = parsed.expiresAt;
    } catch {
      // Legacy plain-string format — treat as unexpired for one read, then it
      // will be overwritten with the new format on the next write.
      sessionId = raw;
    }

    if (expiresAt !== undefined && Date.now() > expiresAt) {
      localStorage.removeItem(sessionKey(restaurantId));
      return null;
    }

    return sessionId || null;
  } catch {
    return null;
  }
}

function writeStoredSession(restaurantId: string, sessionId: string): void {
  localStorage.setItem(
    sessionKey(restaurantId),
    JSON.stringify({ sessionId, expiresAt: Date.now() + SESSION_TTL_MS }),
  );
}

function clearStoredSession(restaurantId: string): void {
  localStorage.removeItem(sessionKey(restaurantId));
}

// ─────────────────────────────────────────────────────────────────────────────

interface CustomerDataProviderProps {
  children: React.ReactNode;
  initialSettings?: RestaurantSettings | null;
}

export function CustomerDataProvider({
  children,
  initialSettings,
}: CustomerDataProviderProps) {
  const searchParams = useSearchParams();
  const urlBranchCode = searchParams.get("branch");
  const initialBranchCode =
    initialSettings?.branchCode ?? initialSettings?.subdomain ?? null;
  const shouldRefetchForBranch =
    !!urlBranchCode &&
    !!initialBranchCode &&
    urlBranchCode !== initialBranchCode;
  const [restaurantSettings, setRestaurantSettings] =
    useState<RestaurantSettings | null>(
      shouldRefetchForBranch ? null : (initialSettings ?? null),
    );
  // If initialSettings were provided by the server, skip the client-side fetch entirely.
  const [isLoading, setIsLoading] = useState(
    !initialSettings || shouldRefetchForBranch,
  );
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionId: null,
    sessionStatus: "new",
    canAddItems: false,
  });
  // Extract session parameters from URL
  const sessionParams: SessionParams = {
    tableId: searchParams.get("tableId") || undefined,
    sessionId: searchParams.get("sessionId") || undefined,
    tableNumber: searchParams.get("tableNumber") || undefined,
    code: searchParams.get("code") || undefined,
    branch: searchParams.get("branch") || undefined,
    table: searchParams.get("table") || undefined,
  };
  const activeBranchCode =
    sessionParams.branch ||
    initialSettings?.branchCode ||
    restaurantSettings?.branchCode ||
    null;

  // Session management functions
  const checkStoredSession = async () => {
    if (!restaurantSettings?.id) return;
    const storedSessionId = readStoredSession(restaurantSettings.id);

    if (storedSessionId) {
      try {
        const response = await fetch(
          `/api/v1/customer/session/check?sessionId=${storedSessionId}&restaurantId=${restaurantSettings.id}`,
        );
        const result = await response.json();

        if (result.success) {
          if (result.sessionStatus === "active") {
            setSessionData({
              sessionId: storedSessionId,
              sessionStatus: "active",
              canAddItems: result.canAddItems,
              orderId: result.sessionData?.orderId,
              tableNumber: result.sessionData?.tableNumber,
              guestCount: result.sessionData?.guestCount,
            });
          } else if (result.sessionStatus === "expired") {
            // Session exists but is completed - keep it for history access
            setSessionData({
              sessionId: storedSessionId,
              sessionStatus: "expired",
              canAddItems: false,
              orderId: result.sessionData?.orderId,
              tableNumber: result.sessionData?.tableNumber,
              guestCount: result.sessionData?.guestCount,
            });
          }
        } else {
          // Invalid or wrong-restaurant session — clear it
          clearStoredSession(restaurantSettings.id);
          setSessionData({
            sessionId: null,
            sessionStatus: "new",
            canAddItems: false,
          });
        }
      } catch (err) {
        console.error("Error checking stored session:", err);
        clearStoredSession(restaurantSettings.id);
        setSessionData({
          sessionId: null,
          sessionStatus: "invalid",
          canAddItems: false,
        });
      }
    }
  };

  const setSessionId = (sessionId: string) => {
    if (restaurantSettings?.id) {
      writeStoredSession(restaurantSettings.id, sessionId);
    }
    setSessionData((prev) => ({
      ...prev,
      sessionId,
      sessionStatus: "active",
      canAddItems: true,
    }));
  };

  const clearSession = () => {
    if (restaurantSettings?.id) {
      clearStoredSession(restaurantSettings.id);
    }
    setSessionData({
      sessionId: null,
      sessionStatus: "new",
      canAddItems: false,
    });
  };

  // Check stored session when user accesses menu directly (no sessionId in URL).
  // If session is expired or belongs to another restaurant, clear it silently.
  const checkStoredSessionForDirectAccess = async () => {
    if (!restaurantSettings?.id) return;
    const storedSessionId = readStoredSession(restaurantSettings.id);

    if (storedSessionId) {
      try {
        const response = await fetch(
          `/api/v1/customer/session/check?sessionId=${storedSessionId}&restaurantId=${restaurantSettings.id}`,
        );
        const result = await response.json();

        if (result.success && result.sessionStatus === "active") {
          // Only keep active sessions for direct access
          setSessionData({
            sessionId: storedSessionId,
            sessionStatus: "active",
            canAddItems: result.canAddItems,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        } else {
          // Expired, invalid, or wrong-restaurant session — clear silently
          clearStoredSession(restaurantSettings.id);
          setSessionData({
            sessionId: null,
            sessionStatus: "new",
            canAddItems: false,
          });
        }
      } catch (err) {
        console.error("Error checking stored session for direct access:", err);
        clearStoredSession(restaurantSettings.id);
        setSessionData({
          sessionId: null,
          sessionStatus: "new",
          canAddItems: false,
        });
      }
    }
  };

  // Fetch restaurant settings only when not pre-populated from the server.
  useEffect(() => {
    if (initialSettings && !shouldRefetchForBranch) return; // Server already provided matching branch data.

    const fetchRestaurantSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        const hostSubdomain = window.location.hostname.split(".")[0];

        if (sessionParams.branch) {
          params.set("branch", sessionParams.branch);
          if (hostSubdomain) params.set("org", hostSubdomain);
        } else if (hostSubdomain) {
          params.set("subdomain", hostSubdomain);
        }

        const response = await fetch(
          `/api/v1/customer/restaurant?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch restaurant data");
        }

        const data = await response.json();
        setRestaurantSettings(data.restaurant);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Error fetching restaurant settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantSettings();
  }, [initialSettings, sessionParams.branch, shouldRefetchForBranch]);

  // Check for stored session on mount and URL parameters
  useEffect(() => {
    if (typeof window !== "undefined" && restaurantSettings?.id) {
      if (sessionParams.sessionId) {
        // Persist to restaurant-scoped storage before validating
        writeStoredSession(restaurantSettings.id, sessionParams.sessionId);
        validateSessionFromUrl(sessionParams.sessionId);
      } else {
        checkStoredSessionForDirectAccess();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParams.sessionId, restaurantSettings?.id]);

  const validateSessionFromUrl = async (urlSessionId: string) => {
    if (!restaurantSettings?.id) return;
    try {
      const response = await fetch(
        `/api/v1/customer/session/check?sessionId=${urlSessionId}&restaurantId=${restaurantSettings.id}`,
      );
      const result = await response.json();

      if (result.success) {
        if (result.sessionStatus === "active") {
          setSessionData({
            sessionId: urlSessionId,
            sessionStatus: "active",
            canAddItems: result.canAddItems,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        } else if (result.sessionStatus === "expired") {
          setSessionData({
            sessionId: urlSessionId,
            sessionStatus: "expired",
            canAddItems: false,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        }
      } else {
        // Session doesn't exist or belongs to a different restaurant
        clearStoredSession(restaurantSettings.id);
        setSessionData({
          sessionId: null,
          sessionStatus: "invalid",
          canAddItems: false,
        });
      }
    } catch (err) {
      console.error("Error validating session from URL:", err);
      setSessionData({
        sessionId: null,
        sessionStatus: "invalid",
        canAddItems: false,
      });
    }
  };

  const value: CustomerDataContextType = {
    restaurantSettings,
    sessionParams,
    activeBranchCode,
    sessionData,
    isLoading,
    error,
    checkStoredSession,
    checkStoredSessionForDirectAccess,
    setSessionId,
    clearSession,
  };

  return (
    <CustomerDataContext.Provider value={value}>
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {
  const context = useContext(CustomerDataContext);
  if (!context) {
    throw new Error(
      "useCustomerData must be used within a CustomerDataProvider",
    );
  }
  return context;
}
