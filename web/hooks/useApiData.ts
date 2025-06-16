'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseApiDataOptions {
  endpoint: string;
  autoRefresh?: number; // milliseconds
  dependencies?: React.DependencyList;
}

interface UseApiDataResult<T> {
  data: T | null;
  isInitialLoading: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiData<T>(options: UseApiDataOptions): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(options.endpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(`Error fetching ${options.endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [options.endpoint]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, ...(options.dependencies || [])]);

  useEffect(() => {
    if (options.autoRefresh && options.autoRefresh > 0) {
      const interval = setInterval(loadData, options.autoRefresh);
      return () => clearInterval(interval);
    }
  }, [loadData, options.autoRefresh]);

  return {
    data,
    isInitialLoading,
    isLoading,
    error,
    refetch: loadData
  };
}
