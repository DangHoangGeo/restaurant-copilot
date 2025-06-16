'use client';

import { useApiData } from './useApiData';
import { useMutation } from './useMutation';

// Restaurant-specific data fetching hook that includes authentication
export function useRestaurantData<T>(endpoint: string, options?: {
  autoRefresh?: number;
  dependencies?: React.DependencyList;
}) {
  return useApiData<T>({
    endpoint: `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    autoRefresh: options?.autoRefresh,
    dependencies: options?.dependencies
  });
}

// Restaurant-specific mutation hook
export function useRestaurantMutation<T, P = unknown>(
  endpoint: string, 
  options?: {
    method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
) {
  return useMutation<T, P>({
    endpoint: `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    method: options?.method,
    onSuccess: options?.onSuccess,
    onError: options?.onError
  });
}
