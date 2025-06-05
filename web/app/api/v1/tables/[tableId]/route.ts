import { createRouteHandlerClient, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Placeholder for getting restaurant_id from user session or JWT
// In a real app, this would involve decoding a JWT or querying a session table
async function getRestaurantIdFromSession(supabase: SupabaseClient): Promise<string | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("Session error or no session for table delete:", sessionError);
    return null;
  }
  // Assuming restaurant_id is stored in user_metadata or a custom claim
  return session.user?.user_metadata?.restaurant_id || "mock-restaurant-id-123"; // Replace with actual logic
}

interface RouteParams {
  params: { tableId: string };
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = createRouteHandlerClient({ cookies });
  const { tableId } = params;

  if (!tableId) {
    return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
  }

  try {
    const userRestaurantId = await getRestaurantIdFromSession(supabase);
    if (!userRestaurantId) {
      return NextResponse.json({ error: 'Unauthorized or restaurant ID not found in session.' }, { status: 401 });
    }

    // Perform the delete operation
    // RLS should be the primary enforcer of ownership, but checking restaurant_id here is good defense-in-depth.
    const { error: deleteError, count } = await supabase
      .from("tables")
      .delete({ count: 'exact' }) // Request count to check if a row was actually deleted
      .eq("id", tableId)
      .eq("restaurant_id", userRestaurantId);

    if (deleteError) {
      console.error('Error deleting table:', deleteError);
      // Check for specific errors if needed, e.g., foreign key constraints
      return NextResponse.json({ error: `Failed to delete table: ${deleteError.message}` }, { status: 500 });
    }

    if (count === 0) {
        // This means the table was not found, or it didn't belong to the user's restaurant (due to the .eq("restaurant_id", userRestaurantId))
        return NextResponse.json({ error: 'Table not found or not authorized to delete.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Table deleted successfully.' }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error('Unexpected error in delete table API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
