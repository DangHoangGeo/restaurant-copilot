import { getCachedUser } from './request-context';

export interface AuthUser {
  userId: string;
  email: string | undefined;
  restaurantId: string | null;
  subdomain: string | null;
  role: string | null;
  // exp is typically part of JWT, Supabase user object doesn\'t expose it directly in the same way
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  // Use cached user data instead of making duplicate Supabase calls
  return await getCachedUser();
}
