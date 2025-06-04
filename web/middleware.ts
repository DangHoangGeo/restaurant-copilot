import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const nextIntlMiddleware = createMiddleware(routing);

const ROOT_DOMAIN = 'baoan.jp';
const W_ROOT_DOMAIN = 'www.baoan.jp';

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
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
