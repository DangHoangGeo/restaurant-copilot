'use client';

import { useState, useCallback } from 'react';

interface UseMutationOptions<T> {
  endpoint: string;
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseMutationResult<T, P> {
  mutate: (payload?: P) => Promise<T>;
  isLoading: boolean;
  error: string | null;
}

export function useMutation<T, P = unknown>(options: UseMutationOptions<T>): UseMutationResult<T, P> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (payload?: P): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(options.endpoint, {
        method: options.method || 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mutation failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    mutate,
    isLoading,
    error
  };
}
