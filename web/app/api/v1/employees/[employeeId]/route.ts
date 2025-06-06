import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Adjust path if necessary

// The local getRestaurantIdFromSession function has been removed.

export async function DELETE(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();

  const employeeId = params.employeeId;

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  if (!employeeId) {
    // This case should ideally be handled by Next.js routing if the [employeeId] segment is mandatory.
    return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
  }

  // Optional: Validate employeeId format (e.g., UUID), though Supabase will error if format is incorrect for PK.
  // if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(employeeId)) {
  //   return NextResponse.json({ error: 'Invalid Employee ID format.' }, { status: 400 });
  // }

  try {
    // user.restaurantId is sourced from getUserFromRequest, ensuring it's from an authenticated session.
    const { error: deleteError, count } = await supabase
      .from("employees")
      .delete({ count: 'exact' }) // Get the count of deleted rows
      .eq("id", employeeId)
      .eq("restaurant_id", user.restaurantId); // CRITICAL: Use authenticated user's restaurant ID

    if (deleteError) {
      console.error('Error deleting employee:', deleteError);
      // Example: Check for specific Supabase/Postgres error codes if needed
      // if (deleteError.code === '23503') { // Foreign key violation
      //   return NextResponse.json({ error: 'Cannot delete employee due to associated records (e.g., schedules).' }, { status: 409 }); // 409 Conflict
      // }
      return NextResponse.json({ error: `Failed to delete employee: ${deleteError.message}` }, { status: 500 });
    }

    if (count === 0) {
      // If count is 0, it means no row matched both the employeeId and the user's restaurantId.
      return NextResponse.json({ error: 'Employee not found under your restaurant or you are not authorized to delete.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Employee deleted successfully.' }, { status: 200 });
    // Alternatively, for DELETE operations, a 204 No Content response is also common:
    // return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error in delete employee API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
