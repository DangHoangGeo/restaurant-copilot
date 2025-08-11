import { NextRequest } from 'next/server';
import { handleRateLimitError } from '@/lib/server/apiError';
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
  console.warn('Upstash Redis environment variables not set. Rate limiting will be disabled.');
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


/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
  return ip;
}

/**
 * Rate limiting middleware function
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  endpoint: string = 'api'
) {
  // Do not rate limit in development or if Redis is not configured
  if (process.env.NODE_ENV === 'development' || !redis) {
    return null;
  }

  // Create a new ratelimiter instance for each request configuration
  const ratelimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, config.window),
    prefix: `ratelimit:${endpoint}`,
  });

  const identifier = defaultKeyGenerator(request);

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
    const origin = request.headers.get('origin');

    // Allow requests in dev environment for easier testing
    if (process.env.NODE_ENV === 'development') return true;

    if (!origin) return false;

    // Compare origin host with the host header
    try {
        const originUrl = new URL(origin);
        const host = request.headers.get('host');
        return originUrl.host === host;
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
  endpoint: string = 'api'
) {
  // Check CSRF protection first for unsafe methods
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    if (!validateCSRF(request)) {
      return handleRateLimitError(
        endpoint,
        'csrf-validation-failed',
        0,
        60000
      );
    }
  }

  // Then apply rate limiting
  return rateLimit(request, config, endpoint);
}

// No cleanup function needed for Upstash Redis client