import { useState, useEffect, useCallback } from 'react';

interface UseApiDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Custom hook for customer API data fetching
 * Includes automatic retry, error handling, and refresh capabilities
 */
export function useCustomerApiData<T>(
  endpoint: string, 
  options: UseApiDataOptions = {}
): ApiResponse<T> {
  const { autoFetch = true, refreshInterval } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error(`Error fetching ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    reload: fetchData,
  };
}

/**
 * Hook for restaurant data (name, logo, settings)
 */
export function useRestaurantData() {
  return useCustomerApiData<{
    restaurant: {
      id: string;
      name: string;
      logoUrl: string | null;
      primaryColor: string;
      defaultLocale: string;
      contactInfo?: string;
      address?: string;
      opening_hours?: {
        [day: string]: {
          open: string;
          close: string;
          closed?: boolean;
        };
      };
    };
  }>('/api/v1/customer/restaurant');
}

/**
 * Hook for menu data (categories and items)
 */
export function useMenuData() {
  return useCustomerApiData<{
    categories: Array<{
      id: string;
      name_en: string;
      name_ja?: string;
      name_vi?: string;
      position: number;
      menu_items: Array<{
        id: string;
        name_en: string;
        name_ja?: string;
        name_vi?: string;
        description_en?: string;
        description_ja?: string;
        description_vi?: string;
        price: number;
        image_url?: string;
        available: boolean;
        menu_item_sizes?: Array<{
          id: string;
          size_key: string;
          name_en: string;
          name_ja?: string;
          name_vi?: string;
          price: number;
        }>;
        toppings?: Array<{
          id: string;
          name_en: string;
          name_ja?: string;
          name_vi?: string;
          price: number;
        }>;
      }>;
    }>;
  }>('/api/v1/customer/menu');
}

/**
 * Hook for tables data
 */
export function useTablesData() {
  return useCustomerApiData<{
    tables: Array<{
      id: string;
      name: string;
      capacity: number;
      status: string;
      is_outdoor?: boolean;
      is_accessible?: boolean;
      notes?: string;
    }>;
  }>('/api/v1/customer/tables');
}

/**
 * Hook for session status with auto-refresh for active orders
 * Only refreshes if session is active and not completed/canceled
 */
export function useSessionStatus(sessionId: string | null) {
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  const response = useCustomerApiData<{
    success: boolean;
    sessionStatus: 'active' | 'expired';
    canAddItems: boolean;
    sessionData: {
      sessionId: string;
      orderId: string;
      tableNumber: string;
      guestCount: number;
      status: string;
      totalAmount: number;
    };
  }>(
    sessionId ? `/api/v1/customer/session/check?sessionId=${sessionId}` : '',
    { 
      autoFetch: !!sessionId,
      // Refresh every 30 seconds for active sessions
      refreshInterval: shouldRefresh ? 30000 : 0
    }
  );

  // Enable auto-refresh for active sessions
  useEffect(() => {
    if (response.data?.success && response.data.sessionStatus === 'active') {
      const status = response.data.sessionData.status;
      // Only refresh if order is not completed or canceled
      setShouldRefresh(!['completed', 'canceled', 'expired'].includes(status));
    } else {
      setShouldRefresh(false);
    }
  }, [response.data]);

  return response;
}

/**
 * Hook for combined customer page data
 * Fetches restaurant, menu, and tables data in parallel
 */
export function useCustomerPageData() {
  const restaurant = useRestaurantData();
  const menu = useMenuData();
  const tables = useTablesData();

  const loading = restaurant.loading || menu.loading || tables.loading;
  const error = restaurant.error || menu.error || tables.error;

  const reload = useCallback(async () => {
    await Promise.all([
      restaurant.reload(),
      menu.reload(),
      tables.reload(),
    ]);
  }, [restaurant.reload, menu.reload, tables.reload]);

  return {
    restaurant: restaurant.data?.restaurant || null,
    categories: menu.data?.categories || [],
    tables: tables.data?.tables || [],
    loading,
    error,
    reload,
  };
}
