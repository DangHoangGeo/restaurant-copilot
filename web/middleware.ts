import { NextResponse, type NextRequest } from "next/server";
import createNextIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing'; // Provides locales, defaultLocale, etc.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSubdomainFromHost } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';

const nextIntl = createNextIntlMiddleware(routing);

// const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'baoan.jp';
// const W_ROOT_DOMAIN = `www.${ROOT_DOMAIN}`; // Not used in the current logic

// This function is adapted from the core logic of the previous web/lib/supabase/middleware.ts
// It will handle Supabase session, RLS, and initial auth check.
async function handleSupabaseAndRls(
  request: NextRequest,
  response: NextResponse // Pass the response to set cookies on
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // IMPORTANT: supabase.auth.getUser() MUST be called to refresh the session
  const { data: { user } } = await supabase.auth.getUser();

  // RLS context setting for anonymous users (public restaurant pages)
  const host = request.headers.get("host") || request.nextUrl.host;
  const subdomainForRls = getSubdomainFromHost(host); // Using your existing util

  if (subdomainForRls && subdomainForRls !== 'www' && !request.nextUrl.pathname.startsWith('/api/auth')) {
    try {
      // Use supabaseAdmin for this lookup as it might need to bypass RLS
      // or if the anon key doesn't have direct access to 'restaurants' table for this purpose.
      const { data: restaurant, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('subdomain', subdomainForRls)
        .single();

      if (restaurantError) {
        logger.warn('middleware', `Error fetching restaurant ID for RLS (subdomain ${subdomainForRls})`, { error: restaurantError.message });
      } else if (restaurant && restaurant.id) {
        // Use the regular 'supabase' client (with user's context or anon context) to call the RPC
        const { error: rpcError } = await supabase.rpc('set_current_restaurant_id_for_session', {
          restaurant_id_value: restaurant.id,
        });
        if (rpcError) {
          logger.error('middleware', `Error setting app.current_restaurant_id for ${restaurant.id} via RPC`, { 
            error: rpcError.message, 
            restaurantId: restaurant.id,
            subdomain: subdomainForRls 
          });
        }
      }
    } catch (error) {
      logger.error('middleware', 'Exception while setting RLS restaurant context', { 
        error: error instanceof Error ? error.message : String(error),
        subdomain: subdomainForRls 
      });
    }
  }
  return { user, response }; // response is modified with cookies
}


export async function middleware(req: NextRequest) {
  // Start with a base response. Cookies from Supabase will be added to this.
  let response = NextResponse.next({
    request: {
      headers: new Headers(req.headers), // Clone headers
    },
  });

  // 1. Handle Supabase session, RLS, and get user.
  // This will also set cookies on the `response` object via the `createServerClient` config.
  const { user: supabaseUser } = await handleSupabaseAndRls(req, response);

  const { pathname } = req.nextUrl;
  
  // Skip next/image and public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/coorder.png') ||
    pathname.match(/\.(png|svg|jpg|jpeg|gif|webp)$/)
  ) {
    return;
  }

  // 2. API Route Locale Stripping:
  // Manually detect locale from pathname since req.nextUrl.locale is not populated for API routes
  let detectedLocale: string | null = null;
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      detectedLocale = locale;
      break;
    }
  }

  // If the path is /<locale>/api/..., rewrite it to /api/...
  if (detectedLocale && pathname.startsWith(`/${detectedLocale}/api/`)) {
    const newPathname = pathname.substring(`/${detectedLocale}`.length); // -> /api/...
    const rewrittenUrl = new URL(newPathname, req.url);
    
    const apiRewriteResponse = NextResponse.rewrite(rewrittenUrl, {
        request: { headers: req.headers } // Pass original request headers to the rewrite operation
    });

    // Transfer cookies from `response` (modified by Supabase) to `apiRewriteResponse`
    response.cookies.getAll().forEach(cookie => {
        apiRewriteResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    // Transfer other headers set by `handleSupabaseAndRls` or other initial logic
    response.headers.forEach((value, key) => {
        if (!apiRewriteResponse.headers.has(key)) { // Avoid overwriting essential rewrite headers
            apiRewriteResponse.headers.set(key, value);
        }
    });
    return apiRewriteResponse; // Return for API routes, skipping further i18n page processing
  }

  // 3. If not an API route that was rewritten, apply next-intl middleware for pages.
  const i18nResponse = nextIntl(req); // This may redirect or rewrite for page internationalization

  // 4. Merge Supabase state (from `response`) with `i18nResponse`.
  // If i18n redirects (e.g., for locale prefix addition for pages), its response takes precedence.
  // Cookies from `response` (Supabase) need to be added to this redirect.
  if (i18nResponse.headers.get('location')) {
    response.cookies.getAll().forEach(cookie => {
        i18nResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    response.headers.forEach((value, key) => {
        // Avoid overwriting essential headers from i18nResponse like 'location' or 'content-type'
        if (!i18nResponse.headers.has(key) && key.toLowerCase() !== 'location' && key.toLowerCase() !== 'content-type') {
            i18nResponse.headers.set(key, value);
        }
    });
    return i18nResponse;
  }

  // If i18n didn't redirect, it might have rewritten the URL or just passed through (NextResponse.next()).
  // The `i18nResponse` is now the primary response. Ensure Supabase cookies/headers are on it.
  response.cookies.getAll().forEach(cookie => {
    if (!i18nResponse.cookies.has(cookie.name)) { // Avoid overriding i18n cookies if any
        i18nResponse.cookies.set(cookie);
    }
  });
  response.headers.forEach((value, key) => {
    if (!i18nResponse.headers.has(key)) {
        i18nResponse.headers.set(key, value);
    }
  });
  
  // The `i18nResponse` is now the one to continue with, assign it back to `response`.
  response = i18nResponse;

  // 5. Apply remaining logic (auth checks, redirects) using the correctly processed state.
  // Determine current pathname and locale *after* i18n processing.
  // `req.nextUrl.locale` should be updated by `nextIntl` if it performed locale detection/rewriting.
  // `req.nextUrl.pathname` will also reflect changes if `nextIntl` rewrote the path (e.g. default locale prefix).
  const currentLocaleForLogic = req.nextUrl.locale || routing.defaultLocale;
  let currentPathnameForLogic = req.nextUrl.pathname;

  // If `response` is a rewrite from `nextIntl` (not a redirect), its 'x-middleware-rewrite' header has the new URL.
  const i18nRewriteHeader = response.headers.get('x-middleware-rewrite');
  if (i18nRewriteHeader) {
    currentPathnameForLogic = new URL(i18nRewriteHeader).pathname;
  }
  
  // Dashboard protection
  if (currentPathnameForLogic.match(new RegExp(`^/${currentLocaleForLogic}/dashboard(/.*)?$`))) {
    if (!supabaseUser) {
      const loginUrl = new URL(`/${currentLocaleForLogic}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users from login/signup/forgot-password pages
  const authPagePatterns = [
    new RegExp(`^/${currentLocaleForLogic}/login$`),
    new RegExp(`^/${currentLocaleForLogic}/signup$`),
    new RegExp(`^/${currentLocaleForLogic}/forgot-password$`),
  ];
  if (supabaseUser && authPagePatterns.some(p => p.test(currentPathnameForLogic))) {
    const defaultDashboardPath = `/${currentLocaleForLogic}/dashboard`;
    return NextResponse.redirect(new URL(defaultDashboardPath, req.url));
  }

  // Subdomain specific logic
  const host = req.headers.get("host") || req.nextUrl.host;
  const subdomain = getSubdomainFromHost(host);

  if (subdomain && subdomain !== 'www') {
    // Block access to /admin on subdomains
    if (currentPathnameForLogic.match(new RegExp(`^/${currentLocaleForLogic}/admin(/.*)?$`))) {
      return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/`, req.url)); // Redirect to subdomain's homepage
    }
  }

  return response; // Return the final response
}

export const config = {
  matcher: [
    // Skip API routes from i18n processing completely to avoid redirect loops
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
