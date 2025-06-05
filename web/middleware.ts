import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { jwtVerify } from 'jose';
import { parse } from 'cookie';

const nextIntlMiddleware = createMiddleware(routing);

const ROOT_DOMAIN = 'baoan.jp';
const W_ROOT_DOMAIN = 'www.baoan.jp';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-super-secret-jwt-key"); // Must be a Uint8Array

function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const url = request.url;

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection for production
  if (host === ROOT_DOMAIN || host === W_ROOT_DOMAIN) {
    return null;
  }

  const parts = host.split(".");
  const isSubdomain = parts.length > 2 && `${parts[parts.length-2]}.${parts[parts.length-1]}` === ROOT_DOMAIN;
  return isSubdomain ? parts[0] : null;
}

export async function middleware(req: NextRequest) {
  const subdomain = extractSubdomain(req);
  const pathname = req.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isLoginPage = pathname.startsWith('/login');
  const isSignupPage = pathname.startsWith('/signup');
  const isForgotPasswordPage = pathname.startsWith('/forgot-password');

  if (isDashboardRoute) {
    const cookies = parse(req.headers.get('cookie') || '');
    const authToken = cookies.auth_token;

    if (!authToken) {
      const loginUrl = new URL(`/${req.nextUrl.locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify the token
      const { payload } = await jwtVerify(authToken, JWT_SECRET);

      // Optionally, attach user/restaurant info to request headers for server components
      // req.headers.set('x-user-id', payload.userId as string);
      // req.headers.set('x-restaurant-id', payload.restaurantId as string);
      // req.headers.set('x-restaurant-subdomain', payload.subdomain as string);

    } catch (error) {
      console.error('JWT verification failed:', error);
      // Invalid token, redirect to login page
      const loginUrl = new URL(`/${req.nextUrl.locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
  } else if (isLoginPage || isSignupPage || isForgotPasswordPage) {
    // If user is already logged in (has a token) and tries to access login/signup, redirect to dashboard
    const cookies = parse(req.headers.get('cookie') || '');
    const authToken = cookies.auth_token;
    if (authToken) {
      try {
        const { payload } = await jwtVerify(authToken, JWT_SECRET);
        const userSubdomain = payload.subdomain as string;
        if (userSubdomain) {
          const dashboardUrl = new URL(`https://${userSubdomain}.baoan.jp/${req.nextUrl.locale}/dashboard`);
          return NextResponse.redirect(dashboardUrl);
        }
      } catch (error) {
        // Token invalid, allow access to login/signup
        console.warn('Invalid token on login/signup page, allowing access.');
      }
    }
  }

  // If no subdomain, allow visit: signup, login, landing pages
  if (!subdomain) {
    return nextIntlMiddleware(req);
  }

  // Validate subdomain
  const apiCheckUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}/api/v1/restaurant/exists?subdomain=${subdomain}`;
  try {
    const res = await fetch(apiCheckUrl);
    const { exists } = await res.json();

    if (!exists) {
      // Redirect to the root domain's 404 page
      return NextResponse.redirect(new URL(`https://${ROOT_DOMAIN}/404`));
    }

    // Block access to admin pages from subdomains
    if (req.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Attach subdomain to searchParams so downstream can read it
    req.nextUrl.searchParams.set("restaurant", subdomain);

    // Continue with next-intl middleware
    return nextIntlMiddleware(req);
  } catch (error) {
    console.error('Error validating subdomain:', error);
    return NextResponse.redirect(new URL(`https://${ROOT_DOMAIN}/500`));
  }
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico|.*\\..*).*)"], // Exclude static assets and files with extensions
};
