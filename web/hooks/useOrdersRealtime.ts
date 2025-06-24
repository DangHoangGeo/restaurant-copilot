'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseRealtime } from './useSupabaseRealtime';

interface UseOrdersRealtimeOptions {
  endpoint: string;
  dependencies?: React.DependencyList;
}

interface UseOrdersRealtimeResult<T> {
  data: T | null;
  isInitialLoading: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRealtimeConnected: boolean;
}

export function useOrdersRealtime<T>(options: UseOrdersRealtimeOptions): UseOrdersRealtimeResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Initial data fetch
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1${options.endpoint.startsWith('/') ? options.endpoint : `/${options.endpoint}`}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      
      // Extract restaurant ID from session if not already set
      if (!restaurantId) {
        try {
          const sessionResponse = await fetch('/api/v1/auth/session', {
            credentials: 'include'
          });
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.user?.restaurantId) {
              setRestaurantId(sessionData.user.restaurantId);
            }
          }
        } catch (sessionError) {
          console.warn('Could not fetch session for realtime setup:', sessionError);
        }
      }
    } catch (err) {
      console.error(`Error fetching ${options.endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [options.endpoint, restaurantId]);

  // Realtime handlers
  const handleRealtimeChange = useCallback(async () => {
    console.log('Realtime change detected, refetching orders...');
    await fetchData();
  }, [fetchData]);

  // Setup realtime subscription for orders
  const { isConnected: isRealtimeConnected } = useSupabaseRealtime({
    table: 'orders',
    filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
    onInsert: handleRealtimeChange,
    onUpdate: handleRealtimeChange,
    onDelete: handleRealtimeChange,
    enabled: !!restaurantId
  });

  // Setup realtime subscription for order_items
  useSupabaseRealtime({
    table: 'order_items',
    onInsert: handleRealtimeChange,
    onUpdate: handleRealtimeChange,
    onDelete: handleRealtimeChange,
    enabled: !!restaurantId
  });

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...(options.dependencies || [])]);

  return {
    data,
    isInitialLoading,
    isLoading,
    error,
    refetch: fetchData,
    isRealtimeConnected
  };
}
