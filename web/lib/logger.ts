import { supabaseAdmin } from "./supabaseAdmin";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "PERF";

interface LogEntry {
  restaurantId?: string;
  userId?: string;
  level: LogLevel;
  endpoint: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  performanceData?: {
    duration?: number;
    dbQueries?: number;
    cacheHits?: number;
    cacheMisses?: number;
  };
}

interface PerformanceTimer {
  start: number;
  dbQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

// In-memory performance tracking
const performanceTimers = new Map<string, PerformanceTimer>();

// Enhanced logging function
export async function logEvent(entry: LogEntry) {
  try {
    // In development, also log to console for immediate feedback
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const level = entry.level.padEnd(5);
      const message = `[${timestamp}] ${level} ${entry.endpoint}: ${entry.message}`;
      
      switch (entry.level) {
        case 'ERROR':
          console.error(message, entry.metadata || '');
          break;
        case 'WARN':
          console.warn(message, entry.metadata || '');
          break;
        case 'DEBUG':
          console.debug(message, entry.metadata || '');
          break;
        case 'PERF':
          console.info(message, entry.performanceData || '');
          break;
        default:
          console.log(message, entry.metadata || '');
      }
    }

    // Store in database for production analysis
    await supabaseAdmin.from("logs").insert([{
      restaurant_id: entry.restaurantId,
      user_id: entry.userId,
      level: entry.level,
      endpoint: entry.endpoint,
      message: entry.message,
      metadata: {
        ...entry.metadata,
        performanceData: entry.performanceData,
        timestamp: entry.timestamp || new Date(),
      }
    }]);
  } catch (error) {
    // Fallback to console if database logging fails
    console.error('Failed to log event:', error, entry);
  }
}

// Performance measurement utilities
export function startPerformanceTimer(requestId: string): void {
  performanceTimers.set(requestId, {
    start: performance.now(),
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });
}

export function incrementDbQuery(requestId: string): void {
  const timer = performanceTimers.get(requestId);
  if (timer) {
    timer.dbQueries++;
  }
}

export function incrementCacheHit(requestId: string): void {
  const timer = performanceTimers.get(requestId);
  if (timer) {
    timer.cacheHits++;
  }
}

export function incrementCacheMiss(requestId: string): void {
  const timer = performanceTimers.get(requestId);
  if (timer) {
    timer.cacheMisses++;
  }
}

export async function endPerformanceTimer(
  requestId: string,
  endpoint: string,
  restaurantId?: string,
  userId?: string
): Promise<void> {
  const timer = performanceTimers.get(requestId);
  if (!timer) return;

  const duration = performance.now() - timer.start;
  performanceTimers.delete(requestId);

  await logEvent({
    restaurantId,
    userId,
    level: 'PERF',
    endpoint,
    message: `Request completed in ${duration.toFixed(2)}ms`,
    performanceData: {
      duration,
      dbQueries: timer.dbQueries,
      cacheHits: timer.cacheHits,
      cacheMisses: timer.cacheMisses,
    },
  });
}

// Convenience functions for different log levels
export const logger = {
  info: (endpoint: string, message: string, metadata?: Record<string, unknown>, restaurantId?: string, userId?: string) =>
    logEvent({ level: 'INFO', endpoint, message, metadata, restaurantId, userId }),
    
  warn: (endpoint: string, message: string, metadata?: Record<string, unknown>, restaurantId?: string, userId?: string) =>
    logEvent({ level: 'WARN', endpoint, message, metadata, restaurantId, userId }),
    
  error: (endpoint: string, message: string, metadata?: Record<string, unknown>, restaurantId?: string, userId?: string) =>
    logEvent({ level: 'ERROR', endpoint, message, metadata, restaurantId, userId }),
    
  debug: (endpoint: string, message: string, metadata?: Record<string, unknown>, restaurantId?: string, userId?: string) =>
    logEvent({ level: 'DEBUG', endpoint, message, metadata, restaurantId, userId }),
    
  perf: (endpoint: string, message: string, performanceData?: LogEntry['performanceData'], restaurantId?: string, userId?: string) =>
    logEvent({ level: 'PERF', endpoint, message, performanceData, restaurantId, userId }),
};
