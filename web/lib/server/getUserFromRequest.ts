import { createClient } from '@/lib/supabase/server'; // Ensure this uses cookies()

export interface AuthUser {
  userId: string;
  email: string | undefined;
  restaurantId: string | null;
  subdomain: string | null;
  role: string | null;
  // exp is typically part of JWT, Supabase user object doesn\'t expose it directly in the same way
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  const supabase = await createClient(); // This should be configured to use cookies()

  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !supabaseUser) {
    if (authError) console.error('Error fetching Supabase user:', authError.message);
    return null;
  }

  // Now fetch restaurant_id and role from your 'users' table
  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select('restaurant_id, role')
    .eq('id', supabaseUser.id)
    .single();

  if (userRecordError || !userRecord) {
    console.error('Error fetching user record or no record found:', userRecordError?.message);
    // Depending on your app logic, you might still want to return a partial user
    // or null if restaurant_id is critical.
    return {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        restaurantId: supabaseUser.user_metadata?.restaurant_id || null,
        subdomain: null,
        role: supabaseUser.user_metadata?.role || null,
    };
  }

  const restaurantId = userRecord.restaurant_id;
  let subdomain: string | null = null;

  if (restaurantId) {
    const { data: restaurantRecord, error: restaurantRecordError } = await supabase
      .from('restaurants')
      .select('subdomain')
      .eq('id', restaurantId)
      .single();
    
    if (restaurantRecordError) {
      console.error('Error fetching restaurant record:', restaurantRecordError.message);
    } else if (restaurantRecord) {
      subdomain = restaurantRecord.subdomain;
    }
  }

  return {
    userId: supabaseUser.id,
    email: supabaseUser.email,
    restaurantId: restaurantId,
    subdomain: subdomain,
    role: userRecord.role,
  };
}
