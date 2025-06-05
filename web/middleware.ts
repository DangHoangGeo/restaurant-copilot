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
  const isDashboardRoute = pathname.startsWith('/dashboard'); // Adjust as needed for other protected routes
  const isLoginPage = pathname.startsWith('/login'); // Assuming locale is already part of pathname or handled by nextIntlMiddleware
  const isSignupPage = pathname.startsWith('/signup');
  const isForgotPasswordPage = pathname.startsWith('/forgot-password');
  const { locale, pathname: currentPathname } = req.nextUrl;


  // Handle authentication for dashboard routes
  if (isDashboardRoute) {
    const cookies = parse(req.headers.get('cookie') || '');
    const authToken = cookies.auth_token;

    if (!authToken) {
      // No token, redirect to login page
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
          // Construct dashboard URL carefully, ensuring locale is present
          const dashboardPath = `/${locale}/dashboard`;
          const dashboardUrl = new URL(dashboardPath, `https://${userSubdomain}.${ROOT_DOMAIN}`); // Assuming ROOT_DOMAIN is like 'example.com'
          // For local dev, this might need adjustment:
          // const dashboardUrl = new URL(dashboardPath, `http://${userSubdomain}.localhost:${req.nextUrl.port}`);
          return NextResponse.redirect(dashboardUrl);
        }
      } catch (error) {
        // Token invalid, allow access to login/signup
        console.warn('Invalid token on login/signup page, allowing access.');
      }
    }
  }

  // If it's a known subdomain and the path is root or just locale root
  // Example: tenant1.localhost:3000/ or tenant1.localhost:3000/en/
  // This needs to be handled before nextIntlMiddleware if the rewrite target (`/r/`) itself isn't directly handled by next-intl's locale prefixing.
  // However, since our target path `/{locale}/r/[subdomain]` includes locale, we can do this after `nextIntlMiddleware` extracts locale.
  // OR, more robustly, do it before and ensure the rewrite target includes the detected/default locale.

  // Let's try a direct rewrite before nextIntlMiddleware for clarity on subdomain routing.
  // This means the path `/r/[subdomain]` won't have locale automatically prefixed by next-intl if we return directly.
  // So, the rewrite target MUST include the locale.

  const pathParts = currentPathname.split('/').filter(Boolean);
  const isSubdomainRootAccess = subdomain && (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === locale));

  if (isSubdomainRootAccess) {
    // Rewrite to /<locale>/r/<subdomain>
    // The `locale` here is from `req.nextUrl.locale` which next-intl might have already processed or defaulted.
    // If next-intl hasn't run yet, `locale` would be the default from routing config or extracted from path if present.
    const rewriteUrl = new URL(`/${locale}/r/${subdomain}${req.nextUrl.search}`, req.url);
    console.log(`Rewriting subdomain root ${req.url} to ${rewriteUrl.toString()}`);
    return NextResponse.rewrite(rewriteUrl);
  }


  // If no subdomain, allow visit: signup, login, landing pages (handled by nextIntlMiddleware)
  if (!subdomain) {
    return nextIntlMiddleware(req);
  }


  // For other paths on a subdomain (e.g., /customer/checkout), they should already be structured with locale.
  // We need to ensure the subdomain validity check happens.
  // And that nextIntlMiddleware correctly handles paths like /en/customer/checkout on tenant1.example.com

  // Validate subdomain (this part seems okay, but ensure it's not conflicting with the rewrite)
  // This check should ideally run for any request on a subdomain that isn't the root rewrite handled above.
  const apiCheckUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}/api/v1/restaurant/exists?subdomain=${subdomain}`;
  try {
    // Avoid fetching this for the already rewritten path to /r/ to prevent loops or redundant checks if /r/ itself is a matcher path.
    // The matcher for this middleware is crucial.
    // The current matcher "/((?!api|_next|static|favicon.ico|.*\\..*).*)" means this runs for most paths.

    const res = await fetch(apiCheckUrl); // Consider if this fetch needs to be protected from running too often
    const { exists } = await res.json();

    if (!exists) {
      // Redirect to the root domain's 404 page
      const notFoundUrl = new URL(`https://${ROOT_DOMAIN}/404`); // Or a generic "subdomain not found" page
      return NextResponse.redirect(notFoundUrl);
    }

    // Block access to /admin or similar non-customer paths on subdomains if necessary
    // if (currentPathname.startsWith(`/${locale}/admin`)) { // Assuming locale is part of path
    //   return NextResponse.redirect(new URL(`/${locale}/`, req.url)); // Redirect to subdomain root (which becomes /r/...)
    // }

    // Attach subdomain to searchParams for downstream components (might be redundant if path contains it)
    // req.nextUrl.searchParams.set("restaurant_subdomain", subdomain); // Use a distinct param name

    // Finally, apply next-intl middleware for locale handling on the (potentially already rewritten) path.
    return nextIntlMiddleware(req);

  } catch (error) {
    console.error('Error validating subdomain or in middleware logic:', error);
    // Fallback to a generic error page on the main domain
    const errorUrl = new URL(`https://${ROOT_DOMAIN}/500`);
    return NextResponse.redirect(errorUrl);
  }
}

export const config = {
   matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - healthz (health check)
     * - sitemap.xml, robots.txt (SEO files)
     * - Anything with a file extension (e.g., .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|healthz|sitemap.xml|robots.txt|.*\\.[^.]+$).*)',
  ],
};
