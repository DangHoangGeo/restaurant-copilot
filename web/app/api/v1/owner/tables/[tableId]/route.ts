import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Adjust path if necessary
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// The local getRestaurantIdFromSession function has been removed.

const tableSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  capacity: z.number().min(1).optional(),
  status: z.enum(['available', 'occupied', 'reserved']).optional(),
  isOutdoor: z.boolean().optional(),
  isAccessible: z.boolean().optional(),
  notes: z.string().optional(),
  qrCode: z.string().optional(),
  qrCodeCreatedAt: z.string().optional(),
});

export async function DELETE(req: NextRequest) {
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
    const { error: deleteError, count } = await supabaseAdmin
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const user: AuthUser | null = await getUserFromRequest();
  const {tableId} = await params; //req.nextUrl.searchParams.get('tableId') || '';
  console.log('PATCH request for tableId:', tableId);
  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  if (!tableId) {
    return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = tableSchema.safeParse(body);

    if (!validated.success) {
      console.error('Validation error:', validated.error);
      return NextResponse.json({ errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name,  capacity, status, isOutdoor, isAccessible, notes, qrCode, qrCodeCreatedAt } = validated.data;
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    if (isOutdoor !== undefined) updateData.is_outdoor = isOutdoor;
    if (isAccessible !== undefined) updateData.is_accessible = isAccessible;
    if (notes !== undefined) updateData.notes = notes;
    if (qrCode !== undefined) updateData.qr_code = qrCode;
    if (qrCodeCreatedAt !== undefined) updateData.qr_code_created_at = qrCodeCreatedAt;

    const { error, data } = await supabaseAdmin
      .from('tables')
      .update(updateData)
      .eq('id', tableId)
      .eq('restaurant_id', user.restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating table:', error);
      return NextResponse.json({ error: 'Failed to update table', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ table: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error updating table:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: msg }, { status: 500 });
  }
}
