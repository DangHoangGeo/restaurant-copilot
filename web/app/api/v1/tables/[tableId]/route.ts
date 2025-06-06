import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Adjust path if necessary

// The local getRestaurantIdFromSession function has been removed.

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();
  const tableId = req.nextUrl.searchParams.get("tableId") || "";

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  if (!tableId) {
    // This case should ideally be handled by Next.js routing if the [tableId] segment is mandatory
    // and correctly configured in the file/folder structure.
    return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
  }

  // Optional: Validate tableId format (e.g., UUID)
  // Example:
  // if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tableId)) {
  //   return NextResponse.json({ error: 'Invalid Table ID format.' }, { status: 400 });
  // }

  try {
    // user.restaurantId is sourced from getUserFromRequest, ensuring it's from an authenticated session.
    const { error: deleteError, count } = await supabase
      .from("tables")
      .delete({ count: 'exact' }) // Get the count of deleted rows
      .eq("id", tableId)
      .eq("restaurant_id", user.restaurantId); // CRITICAL: Use authenticated user's restaurant ID

    if (deleteError) {
      console.error('Error deleting table:', deleteError);
      // Consider more specific error handling based on deleteError.code if needed
      return NextResponse.json({ error: `Failed to delete table: ${deleteError.message}` }, { status: 500 });
    }

    if (count === 0) {
      // If count is 0, it means no row matched both the tableId and the user's restaurantId.
      // This could be because the table doesn't exist or it doesn't belong to this user's restaurant.
      return NextResponse.json({ error: 'Table not found under your restaurant or you are not authorized to delete it.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Table deleted successfully.' }, { status: 200 });
    // Alternatively, for DELETE operations, a 204 No Content response is also common:
    // return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error in delete table API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
