import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { ZodError } from "zod";

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Common error codes
 */
export const ERROR_CODES = {
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Error type definition
 */
export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Standard error messages that are safe to expose to clients
 */
const SAFE_ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  VALIDATION_ERROR: 'Invalid request data',
  INVALID_REQUEST: 'Invalid request format',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  INTERNAL_ERROR: 'An unexpected error occurred',
  DATABASE_ERROR: 'Data service temporarily unavailable',
  EXTERNAL_SERVICE_ERROR: 'External service temporarily unavailable',
};

/**
 * HTTP status codes for each error type
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 503,
  EXTERNAL_SERVICE_ERROR: 502,
};

/**
 * Creates a standardized API error response
 */
export function createApiError(
  code: ErrorCode,
  customMessage?: string,
  details?: unknown,
  requestId?: string
): ApiErrorResponse {
  const id = requestId || randomUUID();
  
  return {
    success: false,
    error: {
      code: ERROR_CODES[code],
      message: customMessage || SAFE_ERROR_MESSAGES[code],
      requestId: id,
      ...(details && process.env.NODE_ENV === 'development' ? { details } : {}),
    },
  };
}

/**
 * Creates a standardized API success response
 */
export function createApiSuccess<T>(
  data: T,
  requestId?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(requestId && { requestId }),
  };
}

/**
 * Creates and logs an API error, then returns NextResponse
 */
export async function handleApiError(
  error: unknown,
  endpoint: string,
  restaurantId?: string,
  userId?: string,
  requestId?: string
): Promise<NextResponse> {
  const id = requestId || randomUUID();
  
  // Determine error type and create appropriate response
  let apiError: ApiErrorResponse;
  let statusCode: number;
  
  if (error instanceof ZodError) {
    // Validation error
    apiError = createApiError('VALIDATION_ERROR', 'Invalid request data', error.flatten().fieldErrors, id);
    statusCode = ERROR_STATUS_CODES.VALIDATION_ERROR;
    
    await logger.warn(endpoint, 'Validation error', {
      requestId: id,
      zodError: error.flatten(),
    }, restaurantId, userId);
    
  } else if (error instanceof Error) {
    // Check for specific error types based on message or properties
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      apiError = createApiError('NOT_FOUND', undefined, undefined, id);
      statusCode = ERROR_STATUS_CODES.NOT_FOUND;
      
      await logger.info(endpoint, 'Resource not found', {
        requestId: id,
        error: error.message,
      }, restaurantId, userId);
      
    } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      apiError = createApiError('CONFLICT', 'Resource already exists', undefined, id);
      statusCode = ERROR_STATUS_CODES.CONFLICT;
      
      await logger.warn(endpoint, 'Resource conflict', {
        requestId: id,
        error: error.message,
      }, restaurantId, userId);
      
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      apiError = createApiError('UNAUTHORIZED', undefined, undefined, id);
      statusCode = ERROR_STATUS_CODES.UNAUTHORIZED;
      
      await logger.warn(endpoint, 'Authentication error', {
        requestId: id,
        error: error.message,
      }, restaurantId, userId);
      
    } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
      apiError = createApiError('FORBIDDEN', undefined, undefined, id);
      statusCode = ERROR_STATUS_CODES.FORBIDDEN;
      
      await logger.warn(endpoint, 'Authorization error', {
        requestId: id,
        error: error.message,
      }, restaurantId, userId);
      
    } else {
      // Generic server error
      apiError = createApiError('INTERNAL_ERROR', undefined, undefined, id);
      statusCode = ERROR_STATUS_CODES.INTERNAL_ERROR;
      
      await logger.error(endpoint, 'Internal server error', {
        requestId: id,
        error: error.message,
        stack: error.stack,
      }, restaurantId, userId);
    }
    
  } else {
    // Unknown error type
    apiError = createApiError('INTERNAL_ERROR', undefined, undefined, id);
    statusCode = ERROR_STATUS_CODES.INTERNAL_ERROR;
    
    await logger.error(endpoint, 'Unknown error type', {
      requestId: id,
      error: typeof error,
      value: error,
    }, restaurantId, userId);
  }
  
  return NextResponse.json(apiError, { status: statusCode });
}

/**
 * Creates a rate limit error response
 */
export async function handleRateLimitError(
  endpoint: string,
  identifier: string,
  limit: number,
  windowMs: number,
  requestId?: string
): Promise<NextResponse> {
  const id = requestId || randomUUID();
  
  await logger.warn(endpoint, 'Rate limit exceeded', {
    requestId: id,
    identifier,
    limit,
    windowMs,
  });
  
  const apiError = createApiError(
    'RATE_LIMIT_EXCEEDED',
    `Rate limit exceeded. Maximum ${limit} requests per ${Math.floor(windowMs / 1000)} seconds`,
    undefined,
    id
  );
  
  return NextResponse.json(apiError, { 
    status: ERROR_STATUS_CODES.RATE_LIMIT_EXCEEDED,
    headers: {
      'Retry-After': Math.ceil(windowMs / 1000).toString(),
    },
  });
}

/**
 * Middleware helper to add request ID to all responses
 */
export function withRequestId<T>(data: T, requestId?: string): T & { requestId?: string } {
  if (requestId) {
    return { ...data, requestId };
  }
  return { ...data } as T & { requestId?: string };
}

/**
 * Creates a CSRF error response
 */
export async function handleCsrfError(
  endpoint: string,
  request: Request,
  requestId?: string
): Promise<NextResponse> {
  const id = requestId || randomUUID();

  await logger.warn(endpoint, 'CSRF validation failed', {
    requestId: id,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    host: request.headers.get('host'),
  });

  const apiError = createApiError(
    'FORBIDDEN',
    'Invalid request origin. Please try again.',
    undefined,
    id
  );

  return NextResponse.json(apiError, {
    status: ERROR_STATUS_CODES.FORBIDDEN,
  });
}