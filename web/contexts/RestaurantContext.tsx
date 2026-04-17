'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';

// Use the existing Restaurant type for consistency
import { Restaurant } from '@/shared/types/restaurant';

export type RestaurantSettings = Restaurant;

interface RestaurantContextType {
  restaurantSettings: RestaurantSettings | null;
  isLoading: boolean;
  error: string | null;
  refetchSettings: () => Promise<void>;
  updateSettings: (updatedSettings: RestaurantSettings) => void;
  isOnboarded: boolean;
  needsOnboarding: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

interface RestaurantProviderProps {
  children: ReactNode;
  initialSettings?: RestaurantSettings | null;
  onboardingRedirectPath?: string | null;
}

export function RestaurantProvider({
  children,
  initialSettings,
  onboardingRedirectPath,
}: RestaurantProviderProps) {
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(
    initialSettings || null
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Calculate onboarding status
  const isOnboarded = restaurantSettings?.onboarded === true;
  const needsOnboarding = restaurantSettings !== null && !isOnboarded;

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/restaurant/settings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }
      
      const data = await response.json();
      setRestaurantSettings(data);
    } catch (err) {
      console.error('Error fetching restaurant settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch if we don't have initial settings
  useEffect(() => {
    if (!initialSettings) {
      fetchSettings();
    }
  }, [initialSettings]);

  // Check for onboarding redirect needs
  useEffect(() => {
    if (!isLoading && needsOnboarding && restaurantSettings) {
      const isOnboardingPage = pathname.includes('/dashboard/onboarding');
      const isApiRoute = pathname.startsWith('/api');
      const redirectPath =
        onboardingRedirectPath === undefined
          ? `/${locale}/dashboard/onboarding`
          : onboardingRedirectPath;
      
      // Only redirect if not already on onboarding page and not an API route
      if (!isOnboardingPage && !isApiRoute && redirectPath) {
        router.push(redirectPath);
      }
    }
  }, [
    isLoading,
    needsOnboarding,
    pathname,
    router,
    locale,
    restaurantSettings,
    onboardingRedirectPath,
  ]);

  const refetchSettings = async () => {
    await fetchSettings();
  };

  const updateSettings = (updatedSettings: RestaurantSettings) => {
    setRestaurantSettings(updatedSettings);
  };

  const value: RestaurantContextType = {
    restaurantSettings,
    isLoading,
    error,
    refetchSettings,
    updateSettings,
    isOnboarded,
    needsOnboarding,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurantSettings() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurantSettings must be used within a RestaurantProvider');
  }
  return context;
}
