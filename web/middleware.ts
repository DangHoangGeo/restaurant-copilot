import { NextResponse, type NextRequest } from "next/server";
import createNextIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing'; // Provides locales, defaultLocale, etc.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSubdomainFromHost } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { canUseRootDashboard } from '@/lib/server/organizations/root-dashboard';

// ---------------------------------------------------------------------------
// In-process cache: subdomain → restaurant_id
// Avoids a DB round-trip on every request for subdomain pages.
// TTL is intentionally short so subdomain changes propagate quickly.
// ---------------------------------------------------------------------------
const subdomainCache = new Map<string, { id: string; expiresAt: number }>();
const SUBDOMAIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedSubdomainId(subdomain: string): string | null {
  const entry = subdomainCache.get(subdomain);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    subdomainCache.delete(subdomain);
    return null;
  }
  return entry.id;
}

function setCachedSubdomainId(subdomain: string, id: string): void {
  subdomainCache.set(subdomain, { id, expiresAt: Date.now() + SUBDOMAIN_CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// In-process cache: userId → UserRestaurantAccess
// Avoids 2 DB round-trips on every authenticated dashboard request.
// Same TTL as subdomain cache — short enough for role/ownership changes to
// propagate within a reasonable time.
// ---------------------------------------------------------------------------
const userRestaurantCache = new Map<string, { restaurant: UserRestaurantAccess; expiresAt: number }>();

function getCachedUserRestaurant(userId: string): UserRestaurantAccess | null {
  const entry = userRestaurantCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userRestaurantCache.delete(userId);
    return null;
  }
  return entry.restaurant;
}

function setCachedUserRestaurant(userId: string, restaurant: UserRestaurantAccess): void {
  userRestaurantCache.set(userId, { restaurant, expiresAt: Date.now() + SUBDOMAIN_CACHE_TTL_MS });
}

type UserRestaurantAccess = {
  id: string;
  subdomain: string;
  onboarded: boolean;
  is_verified: boolean;
  is_active: boolean;
  suspended_at: string | null;
};

type RootDashboardAccess = {
  organization_id: string;
  role: string;
};

async function getRootDashboardAccess(userId: string): Promise<RootDashboardAccess | null> {
  const { data: memberships, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, role, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !memberships) return null;

  const rootAccessMembership = memberships.find((membership) =>
    canUseRootDashboard(membership.role)
  );

  if (!rootAccessMembership) return null;

  return {
    organization_id: rootAccessMembership.organization_id,
    role: rootAccessMembership.role,
  };
}

function buildRootDashboardUrl(locale: string): URL {
  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
    return new URL(`http://localhost:3000/${locale}/dashboard`);
  }

  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
  return new URL(`https://${productionUrl}/${locale}/dashboard`);
}

/**
 * Check if userId is an org member with access to the restaurant at `subdomain`.
 * Used to allow multi-branch org owners to access branch dashboards.
 */
async function getOrgBranchAccess(userId: string, subdomain: string): Promise<UserRestaurantAccess | null> {
  // 1. Resolve the restaurant at this subdomain
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, subdomain, onboarded, is_verified, is_active, suspended_at')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (!restaurant) return null;

  // 2. Find which org this restaurant belongs to
  const { data: orgLink } = await supabaseAdmin
    .from('organization_restaurants')
    .select('organization_id')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();

  if (!orgLink) return null;

  // 3. Verify the user is an active member of that org
  const { data: orgMember } = await supabaseAdmin
    .from('organization_members')
    .select('id, shop_scope')
    .eq('user_id', userId)
    .eq('organization_id', orgLink.organization_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!orgMember) return null;

  // 4. For selected_shops members, confirm access to this specific restaurant
  if (orgMember.shop_scope === 'selected_shops') {
    const { data: scope } = await supabaseAdmin
      .from('organization_member_shop_scopes')
      .select('id')
      .eq('member_id', orgMember.id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (!scope) return null;
  }

  return {
    id: restaurant.id,
    subdomain: restaurant.subdomain,
    onboarded: Boolean(restaurant.onboarded),
    is_verified: Boolean(restaurant.is_verified),
    is_active: Boolean(restaurant.is_active),
    suspended_at: restaurant.suspended_at ?? null,
  };
}

async function getRestaurantForUser(userId: string): Promise<UserRestaurantAccess | null> {
  // Check in-process cache first to avoid DB round-trips on every request.
  const cached = getCachedUserRestaurant(userId);
  if (cached) return cached;

  // Primary source: users table mapping auth user -> restaurant_id
  const { data: userRecords, error: userError } = await supabaseAdmin
    .from('users')
    .select('restaurant_id')
    .eq('id', userId)
    .limit(1);

  if (userError) {
    logger.warn('middleware', 'Failed to query users table for restaurant mapping', {
      userId,
      error: userError.message,
    });
  }

  let restaurantId = userRecords?.[0]?.restaurant_id as string | undefined;

  // Fallback for legacy/multi-restaurant accounts
  if (!restaurantId) {
    const { data: relationships, error: relationshipError } = await supabaseAdmin
      .from('user_restaurant_relationships')
      .select('restaurant_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (relationshipError) {
      logger.warn('middleware', 'Failed to query user_restaurant_relationships fallback', {
        userId,
        error: relationshipError.message,
      });
    } else {
      restaurantId = relationships?.[0]?.restaurant_id as string | undefined;
    }
  }

  if (!restaurantId) return null;

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, subdomain, onboarded, is_verified, is_active, suspended_at')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant?.subdomain) {
    logger.warn('middleware', 'Failed to fetch restaurant details for user', {
      userId,
      restaurantId,
      error: restaurantError?.message || 'Restaurant not found',
    });
    return null;
  }

  const result: UserRestaurantAccess = {
    id: restaurant.id,
    subdomain: restaurant.subdomain,
    onboarded: Boolean(restaurant.onboarded),
    is_verified: Boolean(restaurant.is_verified),
    is_active: Boolean(restaurant.is_active),
    suspended_at: restaurant.suspended_at ?? null,
  };
  setCachedUserRestaurant(userId, result);
  return result;
}

// Share Supabase auth cookies across all subdomains so that a login on the
// root domain (e.g. coorder.ai) is honoured on restaurant.coorder.ai without
// a second sign-in prompt.
function getSharedCookieDomain(): string | undefined {
  if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') return undefined;
  const host = process.env.NEXT_PUBLIC_PRODUCTION_URL;
  return host ? `.${host}` : undefined;
}

const nextIntl = createNextIntlMiddleware(routing);

// const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'baoan.jp';
// const W_ROOT_DOMAIN = `www.${ROOT_DOMAIN}`; // Not used in the current logic

/**
 * Add security headers to the response
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Content Security Policy
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Build CSP based on environment and features
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.google.com https://www.gstatic.com https://apis.google.com https://www.googletagmanager.com https://analytics.google.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/*`,
    `media-src 'self' blob: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/*`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://api.stripe.com https://www.google.com https://www.gstatic.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com wss://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}`,
    "frame-src 'self' https://js.stripe.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  // Join directives with semicolons
  const csp = cspDirectives.join('; ');

  // Set security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add nonce to allow specific inline scripts (if needed)
  response.headers.set('X-CSP-Nonce', nonce);
  
  // Cache control for sensitive pages
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/dashboard') || pathname.includes('/login') || pathname.includes('/admin')) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
}

// This function handles Supabase session refresh and RLS restaurant context.
async function handleSupabaseAndRls(
  request: NextRequest,
  response: NextResponse // Pass the response to set cookies on
) {
  const cookieDomain = getSharedCookieDomain();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options, ...(cookieDomain ? { domain: cookieDomain } : {}) });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, ...(cookieDomain ? { domain: cookieDomain } : {}) });
        },
      },
    }
  );

  // IMPORTANT: supabase.auth.getUser() MUST be called to refresh the session
  const { data: { user } } = await supabase.auth.getUser();

  // RLS context setting for anonymous users (public restaurant pages).
  // The restaurant_id lookup is cached in-process to avoid a DB hit on every request.
  const host = request.headers.get("host") || request.nextUrl.host;
  const subdomainForRls = getSubdomainFromHost(host);

  if (subdomainForRls && subdomainForRls !== 'www' && !request.nextUrl.pathname.startsWith('/api/auth')) {
    try {
      // Check in-process cache first to skip the DB round-trip
      let restaurantId = getCachedSubdomainId(subdomainForRls);

      if (!restaurantId) {
        const { data: restaurant, error: restaurantError } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .eq('subdomain', subdomainForRls)
          .single();

        if (restaurantError) {
          logger.warn('middleware', `Error fetching restaurant ID for RLS (subdomain ${subdomainForRls})`, { error: restaurantError.message });
        } else if (restaurant?.id) {
          restaurantId = restaurant.id;
          setCachedSubdomainId(subdomainForRls, restaurant.id);
        }
      }

      if (restaurantId) {
        const { error: rpcError } = await supabase.rpc('set_current_restaurant_id_for_session', {
          restaurant_id_value: restaurantId,
        });
        if (rpcError) {
          logger.error('middleware', `Error setting app.current_restaurant_id for ${restaurantId} via RPC`, {
            error: rpcError.message,
            restaurantId,
            subdomain: subdomainForRls,
          });
        }
      }
    } catch (error) {
      logger.error('middleware', 'Exception while setting RLS restaurant context', {
        error: error instanceof Error ? error.message : String(error),
        subdomain: subdomainForRls,
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
    
    // Add security headers for API responses
    addSecurityHeaders(apiRewriteResponse, req);
    
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

    // Restaurant ownership verification for subdomain access
    const host = req.headers.get("host") || req.nextUrl.host;
    const subdomain = getSubdomainFromHost(host);

    if (subdomain && subdomain !== 'www') {
      try {
        const primaryRestaurant = await getRestaurantForUser(supabaseUser.id);

        if (!primaryRestaurant) {
          logger.error('middleware', 'Error fetching restaurant for user', {
            userId: supabaseUser.id,
          });
          const loginUrl = new URL(`/${currentLocaleForLogic}/login`, req.url);
          return NextResponse.redirect(loginUrl);
        }

        // Determine the effective restaurant for this request.
        // For multi-branch org members the current subdomain may belong to a
        // branch that is different from their primary (users.restaurant_id) restaurant.
        let restaurant = primaryRestaurant;

        if (restaurant.subdomain !== subdomain) {
          // Check if the user has org-level access to the restaurant at this subdomain.
          const orgBranch = await getOrgBranchAccess(supabaseUser.id, subdomain);

          if (!orgBranch) {
            // No org access — redirect to the user's primary restaurant.
            logger.warn('middleware', 'User attempting to access dashboard for different restaurant', {
              userSubdomain: restaurant.subdomain,
              accessedSubdomain: subdomain,
              userId: supabaseUser.id,
              restaurantId: restaurant.id,
            });
            const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
            if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
              return NextResponse.redirect(new URL(`http://${restaurant.subdomain}.localhost:3000/${currentLocaleForLogic}/dashboard`));
            }
            return NextResponse.redirect(new URL(`https://${restaurant.subdomain}.${productionUrl}/${currentLocaleForLogic}/dashboard`));
          }

          // Org member accessing a branch they own — use branch data for
          // subsequent active/onboarding checks.
          restaurant = orgBranch;
        }

        // Block dashboard access for suspended or unverified/inactive restaurants.
        const isSuspended = restaurant.suspended_at != null;
        const isPendingApproval = !restaurant.is_verified || !restaurant.is_active;
        if (isSuspended || isPendingApproval) {
          const reason = isSuspended ? 'suspended' : 'pending';
          return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/pending-approval?reason=${reason}`, req.url));
        }

        // Check onboarding status (data already fetched above — no extra query needed)
        if (FEATURE_FLAGS.onboarding) {
          const isOnboardingPage = currentPathnameForLogic.includes('/dashboard/onboarding');
          if (!restaurant.onboarded && !isOnboardingPage) {
            return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/dashboard/onboarding`, req.url));
          }
          if (restaurant.onboarded && isOnboardingPage) {
            return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/dashboard`, req.url));
          }
        }
      } catch (error) {
        logger.error('middleware', 'Error verifying restaurant ownership', {
          error: error instanceof Error ? error.message : String(error),
          userId: supabaseUser.id,
          subdomain,
        });
        const loginUrl = new URL(`/${currentLocaleForLogic}/login`, req.url);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // User is on the root/www domain accessing /dashboard.
      // Founder/finance roles stay on the root domain; branch-scoped users are
      // redirected to their primary restaurant subdomain.
      try {
        const rootDashboardAccess = await getRootDashboardAccess(supabaseUser.id);
        if (!rootDashboardAccess) {
          const restaurant = await getRestaurantForUser(supabaseUser.id);

          if (restaurant?.subdomain) {
            const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
            if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
              return NextResponse.redirect(new URL(`http://${restaurant.subdomain}.localhost:3000/${currentLocaleForLogic}/dashboard`));
            }
            return NextResponse.redirect(new URL(`https://${restaurant.subdomain}.${productionUrl}/${currentLocaleForLogic}/dashboard`));
          }
        }
      } catch (error) {
        logger.error('middleware', 'Error fetching restaurant for root-domain dashboard redirect', {
          error: error instanceof Error ? error.message : String(error),
          userId: supabaseUser.id,
        });
      }
    }
  }

  // Redirect logged-in users from login/signup/forgot-password pages to their restaurant dashboard
  const authPagePatterns = [
    new RegExp(`^/${currentLocaleForLogic}/login$`),
    new RegExp(`^/${currentLocaleForLogic}/signup$`),
    new RegExp(`^/${currentLocaleForLogic}/forgot-password$`),
  ];
  if (supabaseUser && authPagePatterns.some(p => p.test(currentPathnameForLogic))) {
    // Founder/finance org roles stay on the root domain after auth pages.
    try {
      const rootDashboardAccess = await getRootDashboardAccess(supabaseUser.id);
      if (rootDashboardAccess) {
        return NextResponse.redirect(buildRootDashboardUrl(currentLocaleForLogic));
      }

      // Look up the user's restaurant subdomain so we redirect to the correct host, not just the path.
      const restaurant = await getRestaurantForUser(supabaseUser.id);

      if (restaurant) {
        // Redirect suspended/pending restaurants to the pending-approval page instead of dashboard.
        const isSuspended = restaurant.suspended_at != null;
        const isPendingApproval = !restaurant.is_verified || !restaurant.is_active;
        if (isSuspended || isPendingApproval) {
          const reason = isSuspended ? 'suspended' : 'pending';
          return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/pending-approval?reason=${reason}`, req.url));
        }

        if (restaurant.subdomain) {
          const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai';
          if (process.env.NEXT_PRIVATE_DEVELOPMENT === 'true') {
            return NextResponse.redirect(new URL(`http://${restaurant.subdomain}.localhost:3000/${currentLocaleForLogic}/dashboard`));
          }
          return NextResponse.redirect(new URL(`https://${restaurant.subdomain}.${productionUrl}/${currentLocaleForLogic}/dashboard`));
        }
      }
    } catch {
      // Fall back to a same-host redirect if the lookup fails
    }
    return NextResponse.redirect(new URL(`/${currentLocaleForLogic}/dashboard`, req.url));
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

  // Add security headers
  addSecurityHeaders(response, req);
  
  return response; // Return the final response
}

export const config = {
  matcher: [
    // Skip API routes from i18n processing completely to avoid redirect loops
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
