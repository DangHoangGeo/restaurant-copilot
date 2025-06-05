import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `cookies().set()` method can't be called from a Server Component if a `NextRequest` is in flight. 
            // Kicking off a redirect with `redirect()` gets around this.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `cookies().set()` method can't be called from a Server Component if a `NextRequest` is in flight. 
            // Kicking off a redirect with `redirect()` gets around this.
          }
        },
      },
    }
  );
}
