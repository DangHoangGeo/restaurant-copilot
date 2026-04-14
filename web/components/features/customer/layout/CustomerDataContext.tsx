"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RestaurantSettings } from '@/shared/types/customer';

interface SessionParams {
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  code?: string;
}

interface SessionData {
  sessionId: string | null;
  sessionStatus: 'new' | 'join' | 'active' | 'invalid' | 'expired';
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

interface CustomerDataProviderProps {
  children: React.ReactNode;
  initialSettings?: RestaurantSettings | null;
}

export function CustomerDataProvider({ children, initialSettings }: CustomerDataProviderProps) {
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(
    initialSettings ?? null
  );
  // If initialSettings were provided by the server, skip the client-side fetch entirely.
  const [isLoading, setIsLoading] = useState(!initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionId: null,
    sessionStatus: 'new',
    canAddItems: false,
  });
  
  const searchParams = useSearchParams();

  // Extract session parameters from URL
  const sessionParams: SessionParams = {
    tableId: searchParams.get('tableId') || undefined,
    sessionId: searchParams.get('sessionId') || undefined,
    tableNumber: searchParams.get('tableNumber') || undefined,
    code: searchParams.get('code') || undefined,
  };

  // Session management functions
  const checkStoredSession = async () => {
    const storedSessionId = localStorage.getItem('coorder_session_id');
    
    if (storedSessionId) {
      try {
        const response = await fetch(`/api/v1/customer/session/check?sessionId=${storedSessionId}`);
        const result = await response.json();
        
        if (result.success) {
          if (result.sessionStatus === 'active') {
            setSessionData({
              sessionId: storedSessionId,
              sessionStatus: 'active',
              canAddItems: result.canAddItems,
              orderId: result.sessionData?.orderId,
              tableNumber: result.sessionData?.tableNumber,
              guestCount: result.sessionData?.guestCount,
            });
          } else if (result.sessionStatus === 'expired') {
            // Session exists but is completed - keep it for history access
            setSessionData({
              sessionId: storedSessionId,
              sessionStatus: 'expired',
              canAddItems: false,
              orderId: result.sessionData?.orderId,
              tableNumber: result.sessionData?.tableNumber,
              guestCount: result.sessionData?.guestCount,
            });
          }
        } else {
          // Invalid session, clear it
          localStorage.removeItem('coorder_session_id');
          setSessionData({
            sessionId: null,
            sessionStatus: 'invalid',
            canAddItems: false,
          });
        }
      } catch (error) {
        console.error('Error checking stored session:', error);
        localStorage.removeItem('coorder_session_id');
        setSessionData({
          sessionId: null,
          sessionStatus: 'invalid',
          canAddItems: false,
        });
      }
    }
  };

  const setSessionId = (sessionId: string) => {
    localStorage.setItem('coorder_session_id', sessionId);
    setSessionData(prev => ({
      ...prev,
      sessionId,
      sessionStatus: 'active',
      canAddItems: true,
    }));
  };

  const clearSession = () => {
    localStorage.removeItem('coorder_session_id');
    setSessionData({
      sessionId: null,
      sessionStatus: 'new',
      canAddItems: false,
    });
  };

  // Check stored session when user accesses menu directly (no sessionId in URL)
  // If session is expired, clear it instead of keeping it for auto-redirect
  const checkStoredSessionForDirectAccess = async () => {
    const storedSessionId = localStorage.getItem('coorder_session_id');
    
    if (storedSessionId) {
      try {
        const response = await fetch(`/api/v1/customer/session/check?sessionId=${storedSessionId}`);
        const result = await response.json();
        
        if (result.success && result.sessionStatus === 'active') {
          // Only keep active sessions for direct access
          setSessionData({
            sessionId: storedSessionId,
            sessionStatus: 'active',
            canAddItems: result.canAddItems,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        } else {
          // For expired or invalid sessions, clear them when accessing menu directly
          localStorage.removeItem('coorder_session_id');
          setSessionData({
            sessionId: null,
            sessionStatus: 'new',
            canAddItems: false,
          });
        }
      } catch (error) {
        console.error('Error checking stored session for direct access:', error);
        localStorage.removeItem('coorder_session_id');
        setSessionData({
          sessionId: null,
          sessionStatus: 'new',
          canAddItems: false,
        });
      }
    }
  };

  // Fetch restaurant settings only when not pre-populated from the server.
  useEffect(() => {
    if (initialSettings) return; // Server already provided data — skip fetch.

    const fetchRestaurantSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const subdomain = window.location.hostname.split('.')[0];
        const response = await fetch(`/api/v1/customer/restaurant?subdomain=${subdomain}`);

        if (!response.ok) {
          throw new Error('Failed to fetch restaurant data');
        }

        const data = await response.json();
        setRestaurantSettings(data.restaurant);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching restaurant settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantSettings();
  }, [initialSettings]);

  // Check for stored session on mount and URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First check URL parameters for sessionId
      if (sessionParams.sessionId) {
        // Store locally for persistence, but do NOT grant canAddItems until server confirms
        localStorage.setItem('coorder_session_id', sessionParams.sessionId);

        // Validate the session with the server — canAddItems will be set by the response
        validateSessionFromUrl(sessionParams.sessionId);
      } else {
        // Check for stored session if no URL parameter
        // If user is accessing menu page directly without sessionId, 
        // check if stored session is active, if expired clear it
        checkStoredSessionForDirectAccess();
      }
    }
  }, [sessionParams.sessionId]);

  const validateSessionFromUrl = async (urlSessionId: string) => {
    try {
      const response = await fetch(`/api/v1/customer/session/check?sessionId=${urlSessionId}`);
      const result = await response.json();
      
      if (result.success) {
        if (result.sessionStatus === 'active') {
          setSessionData({
            sessionId: urlSessionId,
            sessionStatus: 'active',
            canAddItems: result.canAddItems,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        } else if (result.sessionStatus === 'expired') {
          // Session exists but is completed - set as expired, don't clear
          setSessionData({
            sessionId: urlSessionId,
            sessionStatus: 'expired',
            canAddItems: false,
            orderId: result.sessionData?.orderId,
            tableNumber: result.sessionData?.tableNumber,
            guestCount: result.sessionData?.guestCount,
          });
        }
      } else {
        // Session doesn't exist - invalid session, clear it
        localStorage.removeItem('coorder_session_id');
        setSessionData({
          sessionId: null,
          sessionStatus: 'invalid',
          canAddItems: false,
        });
      }
    } catch (error) {
      console.error('Error validating session from URL:', error);
      setSessionData({
        sessionId: null,
        sessionStatus: 'invalid',
        canAddItems: false,
      });
    }
  };

  const value: CustomerDataContextType = {
    restaurantSettings,
    sessionParams,
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
    throw new Error('useCustomerData must be used within a CustomerDataProvider');
  }
  return context;
}
