import { getCachedUser } from './request-context';

export interface AuthUserRestaurantSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  subdomain: string;
  branch_code?: string | null;
  company_public_subdomain?: string | null;
  primaryColor: string;
  defaultLocale: string;
  onboarded: boolean;
  owner_photo_url: string | null;
  owner_story_en: string;
  owner_story_ja: string;
  owner_story_vi: string;
}

export interface AuthUser {
  userId: string;
  email: string | undefined;
  restaurantId: string | null;
  subdomain: string | null;
  role: string | null;
  restaurantSettings: AuthUserRestaurantSettings | null;
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  // Use cached user data instead of making duplicate Supabase calls
  return await getCachedUser();
}
