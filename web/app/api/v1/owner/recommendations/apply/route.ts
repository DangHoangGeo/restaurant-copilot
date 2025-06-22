import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuthUser, getUserFromRequest } from '@/lib/server/getUserFromRequest';

export async function POST() {
  const user: AuthUser | null = await getUserFromRequest();
  
    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
    }

  // It's generally better to use a service role client for such admin operations
  // to ensure necessary permissions and avoid exposing RPCs to anon/authenticated roles
  // if they are meant for backend processes.
  // However, if RLS is set up for the `apply_recommendations` function to be callable
  // by an authenticated user for their own restaurant, then using the user's client is fine.
  // For this example, let's use the user's client, assuming RLS is appropriate.

  // const supabase = createRouteHandlerClient<Database>({ cookies }); // User-context Supabase client
  // For admin tasks like this, a service role client is often more appropriate.
  // Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables.

  try {
    const { data, error } = await supabaseAdmin.rpc('apply_recommendations', {
      p_restaurant_id: user.restaurantId,
    });

    if (error) {
      console.error('Error calling apply_recommendations RPC:', error);
      return NextResponse.json({ error: error.message || 'Failed to apply recommendations' }, { status: 500 });
    }

    // The RPC returns { success: true }
    if (data && (data as { success: boolean }).success) {
      return NextResponse.json({ success: true, message: 'Recommendations applied successfully' });
    }
    else {
      return NextResponse.json({ error: 'Failed to apply recommendations (unexpected RPC response)' }, { status: 500 });
    }

  } catch (error) {
    console.error('Exception calling apply_recommendations RPC:', error);
    return NextResponse.json({ error: (error as Error).message || 'An unexpected error occurred' }, { status: 500 });
  }
}
