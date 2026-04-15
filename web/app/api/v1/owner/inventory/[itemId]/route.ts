import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';

export interface UpdateInventoryItemRequest {
  stock_level?: number;
  threshold?: number;
  menu_item_id?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;

  try {
    user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to write (owner or manager)
    if (!user.role || !['owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { itemId } = await params;
    const restaurantId = user.restaurantId;
    const body: UpdateInventoryItemRequest = await request.json();

    // Fetch the item first to verify it belongs to this restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, restaurant_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (existingItem.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.stock_level !== undefined) {
      if (body.stock_level < 0) {
        return NextResponse.json(
          { error: 'Stock level must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.stock_level = body.stock_level;
    }

    if (body.threshold !== undefined) {
      if (body.threshold < 0) {
        return NextResponse.json(
          { error: 'Threshold must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.threshold = body.threshold;
    }

    if (body.menu_item_id !== undefined) {
      updateData.menu_item_id = body.menu_item_id;
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to update inventory item' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiSuccess({ item: data }, requestId),
      { status: 200 }
    );
  } catch (error) {
    return await handleApiError(
      error,
      'inventory-update',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;

  try {
    user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to write (owner or manager)
    if (!user.role || !['owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { itemId } = await params;
    const restaurantId = user.restaurantId;

    // Fetch the item first to verify it belongs to this restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, restaurant_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (existingItem.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to delete inventory item' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiSuccess({ success: true }, requestId),
      { status: 200 }
    );
  } catch (error) {
    return await handleApiError(
      error,
      'inventory-delete',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}
