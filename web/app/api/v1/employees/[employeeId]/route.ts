import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Placeholder for getting restaurant_id from user session or JWT
async function getRestaurantIdFromSession(supabase: any): Promise<string | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("Session error or no session for employee delete:", sessionError);
    return null;
  }
  return session.user?.user_metadata?.restaurant_id || "mock-restaurant-id-123"; // Replace with actual logic
}

interface RouteParams {
  params: { employeeId: string };
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = createRouteHandlerClient({ cookies });
  const { employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
  }

  try {
    const userRestaurantId = await getRestaurantIdFromSession(supabase);
    if (!userRestaurantId) {
      return NextResponse.json({ error: 'Unauthorized or restaurant ID not found in session.' }, { status: 401 });
    }

    // Perform the delete operation
    // RLS should be the primary enforcer, but checking restaurant_id is good defense-in-depth.
    const { error: deleteError, count } = await supabase
      .from("employees")
      .delete({ count: 'exact' }) // Request count to check if a row was actually deleted
      .eq("id", employeeId)
      .eq("restaurant_id", userRestaurantId);

    if (deleteError) {
      console.error('Error deleting employee:', deleteError);
      // Example: Check for foreign key constraint violation if an employee cannot be deleted due to existing relations
      // if (deleteError.code === '23503') { // PostgreSQL foreign key violation error code
      //   return NextResponse.json({ error: 'Cannot delete employee. They may have associated records (e.g., schedules). Please reassign or delete those records first.' }, { status: 409 }); // Conflict
      // }
      return NextResponse.json({ error: `Failed to delete employee: ${deleteError.message}` }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Employee not found or not authorized to delete.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Employee deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in delete employee API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
}
