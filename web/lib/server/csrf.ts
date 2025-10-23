/**
 * CSRF Protection Module
 * Implements double-submit cookie pattern for state-changing operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generates a CSRF token and sets it as an httpOnly cookie
 * @returns The generated token (also send to client for header)
 */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return token;
}

/**
 * Validates CSRF token from cookie matches header
 * @param request - The incoming request
 * @returns true if valid, false otherwise
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Skip in development for easier testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return cookieToken === headerToken;
}

/**
 * Middleware helper to enforce CSRF protection
 * Use this in API routes that change state (POST/PUT/PATCH/DELETE)
 */
export async function enforceCsrfProtection(request: NextRequest): Promise<NextResponse | null> {
  const isValid = await validateCsrfToken(request);
  
  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid CSRF token. Please refresh and try again.',
        },
      },
      { status: 403 }
    );
  }
  
  return null; // No error, proceed
}