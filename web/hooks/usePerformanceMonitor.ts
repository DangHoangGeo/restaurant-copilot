'use client';

import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  navigationTime: number;
  loadTime: number;
  componentName: string;
}

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const mounted = useRef<boolean>(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const navigationTime = Date.now() - startTime.current;
      
      // Log performance metrics (in production, send to analytics)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Performance - ${componentName}:`, {
          navigationTime: `${navigationTime}ms`,
          timestamp: new Date().toISOString()
        });
      }

      // In production, you might want to send this to your analytics service
      // analytics.track('page_performance', {
      //   componentName,
      //   navigationTime,
      //   timestamp: Date.now()
      // });
    }
  }, [componentName]);

  const logInteraction = (action: string, data?: Record<string, unknown>) => {
    const interactionTime = Date.now() - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Interaction - ${componentName}/${action}:`, {
        time: `${interactionTime}ms`,
        data
      });
    }
  };

  return { logInteraction };
}
