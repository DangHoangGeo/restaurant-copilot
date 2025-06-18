'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceOptimizationsConfig {
  enablePrefetching?: boolean;
  enableImageOptimization?: boolean;
  enableCodeSplitting?: boolean;
  cacheStrategy?: 'aggressive' | 'conservative' | 'minimal';
}

interface IntersectionObserverEntry {
  isIntersecting: boolean;
  target: Element;
}

export function usePerformanceOptimizations(config: PerformanceOptimizationsConfig = {}) {
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const {
    enablePrefetching = true,
    enableImageOptimization = true,
    enableCodeSplitting = true,
    cacheStrategy = 'conservative'
  } = config;

  // Intersection Observer for lazy loading and prefetching
  const createIntersectionObserver = useCallback(() => {
    if (typeof window === 'undefined' || !enablePrefetching) return;

    observerRef.current = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const itemId = element.getAttribute('data-item-id');
            
            if (itemId) {
              // Prefetch item details when it comes into view
              queryClient.prefetchQuery({
                queryKey: ['menu-item', itemId],
                queryFn: () => fetch(`/api/v1/customer/menu/items/${itemId}`).then(res => res.json()),
                staleTime: 5 * 60 * 1000, // 5 minutes
              });
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start prefetching 50px before the element is visible
        threshold: 0.1
      }
    );

    return observerRef.current;
  }, [enablePrefetching, queryClient]);

  // Observe element for prefetching
  const observeElement = useCallback((element: HTMLElement | null) => {
    if (!element || !observerRef.current) return;
    
    observerRef.current.observe(element);
    
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, []);

  // Image optimization utilities
  const optimizeImage = useCallback((src: string, width: number, height: number) => {
    if (!enableImageOptimization) return src;
    
    // Add Next.js image optimization parameters
    const url = new URL(src, window.location.origin);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('q', '75'); // Quality setting
    
    return url.toString();
  }, [enableImageOptimization]);

  // Code splitting utilities
  const lazyLoadComponent = useCallback(async (componentPath: string) => {
    if (!enableCodeSplitting) return;
    
    try {
      const module = await import(componentPath);
      return module.default || module;
    } catch (error) {
      console.error('Failed to lazy load component:', componentPath, error);
      return null;
    }
  }, [enableCodeSplitting]);

  // Cache management based on strategy
  const configureCaching = useCallback(() => {
    const cacheConfigs = {
      aggressive: {
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
      },
      conservative: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
      minimal: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
      }
    };

    return cacheConfigs[cacheStrategy];
  }, [cacheStrategy]);

  // Resource preloading
  const preloadResource = useCallback((href: string, as: 'script' | 'style' | 'image' | 'font') => {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
    
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Critical resource hints
  const addResourceHints = useCallback(() => {
    if (typeof document === 'undefined') return;

    // Preconnect to external domains
    const preconnectDomains = [
      'https://images.unsplash.com',
      'https://api.restaurant.com'
    ];

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });

    // DNS prefetch for additional domains
    const dnsPrefetchDomains = [
      'https://fonts.googleapis.com',
      'https://cdn.restaurant.com'
    ];

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }, []);

  // Performance monitoring
  const measurePerformance = useCallback((name: string, fn: (...args: unknown[]) => Promise<unknown>) => {
    return async (...args: unknown[]) => {
      const startTime = performance.now();
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        
        // Log performance metrics
        console.log(`${name} took ${endTime - startTime} milliseconds`);
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        console.error(`${name} failed after ${endTime - startTime} milliseconds`, error);
        throw error;
      }
    };
  }, []);

  // Initialize performance optimizations
  useEffect(() => {
    //const observer = createIntersectionObserver();
    addResourceHints();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [createIntersectionObserver, addResourceHints]);

  return {
    observeElement,
    optimizeImage,
    lazyLoadComponent,
    configureCaching,
    preloadResource,
    measurePerformance,
    cacheConfig: configureCaching()
  };
}
