import { NextRequest } from 'next/server';
import { handleRateLimitError } from '@/lib/server/apiError';

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Whether to skip rate limiting for certain conditions */
  skip?: (request: NextRequest) => boolean;
  /** Custom identifier function (defaults to IP + user agent) */
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * Rate limit record
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiting store
 * NOTE: In production, this should be replaced with Redis for multi-instance support
 */
class MemoryRateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  // Clean up expired entries every 5 minutes
  private cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime < now) {
        this.store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  get(key: string): RateLimitRecord | undefined {
    const record = this.store.get(key);
    if (record && record.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return record;
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  increment(key: string, windowMs: number): RateLimitRecord {
    const now = Date.now();
    const existing = this.get(key);
    
    if (existing) {
      existing.count++;
      return existing;
    } else {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.set(key, newRecord);
      return newRecord;
    }
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global store instance
const rateLimitStore = new MemoryRateLimitStore();

/**
 * Default key generator - uses IP address and user agent
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a simple hash of IP + user agent for privacy
  const combined = `${ip}:${userAgent}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `rl:${Math.abs(hash).toString(16)}`;
}

/**
 * Rate limiting middleware function
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  endpoint: string = 'api'
) {
  // Skip rate limiting if configured
  if (config.skip && config.skip(request)) {
    return null;
  }

  // Generate key for this request
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = `${endpoint}:${keyGenerator(request)}`;

  // Get/increment the count
  const record = rateLimitStore.increment(key, config.windowMs);

  // Check if limit exceeded
  if (record.count > config.max) {
    return handleRateLimitError(
      endpoint,
      key,
      config.max,
      config.windowMs
    );
  }

  return null;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // For state-changing operations (POST, PUT, PATCH, DELETE)
  MUTATION: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // For data fetching operations (GET)
  QUERY: {
    max: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  // For authentication endpoints
  AUTH: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // For file uploads
  UPLOAD: {
    max: 3,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * CSRF protection - validates origin and referrer headers
 */
export function validateCSRFHeaders(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Allow same-origin requests
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const expectedOrigin = `${originUrl.protocol}//${host}`;
      if (origin === expectedOrigin) {
        return true;
      }
    } catch {
      // Invalid origin URL
      return false;
    }
  }

  // Fallback to referer check
  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        return true;
      }
    } catch {
      // Invalid referer URL
      return false;
    }
  }

  return false;
}

/**
 * Check for required CSRF token header for unsafe methods
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  
  // Only check CSRF token for unsafe methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  // Check for custom CSRF header (simple approach)
  const csrfHeader = request.headers.get('x-owner-csrf');
  if (csrfHeader === 'owner-request') {
    return true;
  }

  // Validate same-origin request
  return validateCSRFHeaders(request);
}

/**
 * Combined rate limiting and CSRF protection middleware
 */
export async function protectEndpoint(
  request: NextRequest,
  config: RateLimitConfig,
  endpoint: string = 'api'
) {
  // Check CSRF protection first
  if (!validateCSRFToken(request)) {
    return handleRateLimitError(
      endpoint,
      'csrf-validation',
      config.max,
      config.windowMs
    );
  }

  // Then apply rate limiting
  return rateLimit(request, config, endpoint);
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimit(): void {
  rateLimitStore.cleanup();
}