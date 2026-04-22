import { NextRequest } from 'next/server';
import { handleRateLimitError, handleCsrfError } from '@/lib/server/apiError';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client only if env vars are present
let redis: Redis | undefined;

if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });
} else {
  console.warn('Upstash Redis environment variables not set. Falling back to in-memory rate limiting.');
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  max: number;
  /** Time window in seconds, e.g., "60s" */
  window: `${number}s` | `${number}m` | `${number}h` | `${number}d`;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // For state-changing operations (POST, PUT, PATCH, DELETE)
  MUTATION: { max: 20, window: '60s' },
  // For data fetching operations (GET)
  QUERY: { max: 100, window: '60s' },
  // For authentication endpoints
  AUTH: { max: 10, window: '15m' },
  // For file uploads
  UPLOAD: { max: 5, window: '60s' },
} as const;

type MemoryRateLimitEntry = {
  tokens: number;
  lastRefill: number;
};

const memoryRateLimitStore = new Map<string, MemoryRateLimitEntry>();

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
  return ip.split(',')[0]?.trim() || '127.0.0.1';
}

function windowToMs(window: RateLimitConfig['window']): number {
  const value = Number.parseInt(window.slice(0, -1), 10);
  const unit = window.slice(-1);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}

function consumeMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = memoryRateLimitStore.get(key) || { tokens: limit, lastRefill: now };
  const timePassed = now - entry.lastRefill;

  entry.tokens = Math.min(limit, entry.tokens + (timePassed / windowMs) * limit);
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    memoryRateLimitStore.set(key, entry);
    return true;
  }

  memoryRateLimitStore.set(key, entry);
  return false;
}

/**
 * Rate limiting middleware function
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  endpoint: string = 'api'
) {
  const identifier = defaultKeyGenerator(request);

  if (!redis) {
    const windowMs = windowToMs(config.window);
    const allowed = consumeMemoryRateLimit(
      `${endpoint}:${identifier}`,
      config.max,
      windowMs
    );

    if (!allowed) {
      return handleRateLimitError(
        endpoint,
        identifier,
        config.max,
        windowMs
      );
    }

    return null;
  }

  // Create a new ratelimiter instance for each request configuration
  const ratelimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, config.window),
    prefix: `ratelimit:${endpoint}`,
  });

  const { success, limit, remaining: _remaining, reset } = await ratelimiter.limit(identifier);

  if (!success) {
    return handleRateLimitError(
      endpoint,
      identifier,
      limit,
      reset - Date.now()
    );
  }

  return null;
}

/**
 * CSRF protection - validates origin header for same-site requests
 */
export function validateCSRF(request: NextRequest): boolean {
    // Allow requests in dev and test environments for easier local iteration.
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return true;
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // If no origin header, check referer as fallback (some requests don't send origin)
    const sourceUrl = origin || referer;
    
    if (!sourceUrl || !host) {
        return false;
    }

    try {
        const sourceUrlObj = new URL(sourceUrl);
        const sourceHost = sourceUrlObj.host;
        
        // Allow exact host match
        if (sourceHost === host) {
            return true;
        }

        // Allow subdomain requests within the same root domain
        const rootDomain = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
        
        // Check if both hosts belong to the same root domain
        const hostEndsWithRoot = host.endsWith(`.${rootDomain}`) || host === rootDomain;
        const sourceEndsWithRoot = sourceHost.endsWith(`.${rootDomain}`) || sourceHost === rootDomain;
        
        if (hostEndsWithRoot && sourceEndsWithRoot) {
            return true;
        }

        // Allow localhost for development/testing
        if (host.includes('localhost') && sourceHost.includes('localhost')) {
            return true;
        }

        // Allow Vercel preview URLs
        if (host.includes('vercel.app') && sourceHost.includes('vercel.app')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Combined rate limiting and CSRF protection middleware
 */
export async function protectEndpoint(
  request: NextRequest,
  config: RateLimitConfig,
  endpoint: string = 'api',
  requestId?: string
) {
  const method = request.method.toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isMutation && !validateCSRF(request)) {
    return handleCsrfError(
      endpoint,
      request,
      requestId
    );
  }

  // Then apply rate limiting
  return rateLimit(request, config, endpoint);
}

export function __resetRateLimitMemoryStore() {
  memoryRateLimitStore.clear();
}

// No cleanup function needed for Upstash Redis client
