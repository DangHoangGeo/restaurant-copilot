import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSubdomainFromHost } from '@/lib/utils'; // Make sure this utility exists and works
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Make sure this admin client is configured
import { logger } from '@/lib/logger';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // --- BEGIN: Set restaurant context for RLS ---
  const host = request.headers.get("host") || request.nextUrl.host;
  const subdomain = getSubdomainFromHost(host);

  if (subdomain && subdomain !== 'www' && !request.nextUrl.pathname.startsWith('/api/auth')) { // Avoid for root domain & auth api routes
    try {
      const { data: restaurant, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (restaurantError) {
        await logger.warn('middleware', 'Error fetching restaurant ID for subdomain', {
          subdomain,
          error: restaurantError.message
        });
      } else if (restaurant && restaurant.id) {
        const { error: rpcError } = await supabase.rpc('set_current_restaurant_id_for_session', {
          restaurant_id_value: restaurant.id,
        });
        if (rpcError) {
          await logger.error('middleware', 'Error setting app.current_restaurant_id via RPC', {
            restaurantId: restaurant.id,
            error: rpcError.message
          });
        }
      }
    } catch (error) {
      await logger.error('middleware', 'Exception while setting restaurant context', {
        subdomain,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  // --- END: Set restaurant context for RLS ---

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    // Add any other public paths that do not require login
    !request.nextUrl.pathname.startsWith('/public') && // Example for public pages
    !request.nextUrl.pathname.endsWith('/menu') // Example for public menu if on subdomain
  ) {
    // no user, potentially respond by redirecting the user to the login page
    // Only redirect if not on a public page or a page that might be accessed by subdomain anonymously
    const isLikelyPublicPage = subdomain && subdomain !== 'www'; // A simple heuristic

    if (
      !isLikelyPublicPage ||
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/branch')
    ) { // Always protect branch operations
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
