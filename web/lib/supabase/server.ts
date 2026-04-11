import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Share auth cookies across all subdomains (e.g. restaurant.coorder.ai) so a
// single login on the root domain does not prompt the user to log in again on
// their subdomain dashboard.  In development we leave domain unset so the
// browser default (exact host) is used, because `.localhost` handling varies
// across browsers and OS configurations.
function getSharedCookieDomain(): string | undefined {
  if (process.env.NEXT_PRIVATE_DEVELOPMENT === "true") return undefined;
  const host = process.env.NEXT_PUBLIC_PRODUCTION_URL;
  return host ? `.${host}` : undefined;
}

export async function createClient() {
  const cookieStore = await cookies();
  const cookieDomain = getSharedCookieDomain();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              }),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}