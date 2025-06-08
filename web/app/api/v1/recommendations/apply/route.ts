import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types'; // Assuming you have this for types

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON' }, { status: 400 });
  }

  const { restaurantId } = requestBody;

  if (!restaurantId || typeof restaurantId !== 'string') {
    return NextResponse.json({ error: 'restaurantId is required and must be a string' }, { status: 400 });
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
  const supabaseAdmin = createRouteHandlerClient<Database>(
    { cookies },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role for admin tasks
    }
  );

  try {
    const { data, error } = await supabaseAdmin.rpc('apply_recommendations', {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      console.error('Error calling apply_recommendations RPC:', error);
      return NextResponse.json({ error: error.message || 'Failed to apply recommendations' }, { status: 500 });
    }

    // The RPC returns { success: true }
    if (data && (data as any).success === true) {
      return NextResponse.json({ success: true });
    } else {
      // This case might occur if the RPC returns success: false or an unexpected structure
      console.error('apply_recommendations RPC did not return success:true, data:', data);
      return NextResponse.json({ error: 'Failed to apply recommendations (unexpected RPC response)' }, { status: 500 });
    }

  } catch (e: any) {
    console.error('Exception calling apply_recommendations RPC:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
