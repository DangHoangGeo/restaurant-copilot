import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  stock_level: number;
  threshold: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  stock_level: number;
  threshold: number;
  menu_item_id?: string | null;
}

export async function GET() {
  const requestId = randomUUID();
  let user: Awaited<ReturnType<typeof getUserFromRequest>> | null = null;

  try {
    user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantId = user.restaurantId;

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory items' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiSuccess({ items: data || [] }, requestId),
      { status: 200 }
    );
  } catch (error) {
    return await handleApiError(
      error,
      'inventory-list',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}

export async function POST(request: Request) {
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

    const restaurantId = user.restaurantId;
    const body: CreateInventoryItemRequest = await request.json();

    // Validate required fields
    if (body.stock_level === undefined || body.stock_level < 0) {
      return NextResponse.json(
        { error: 'Stock level must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.threshold === undefined || body.threshold < 0) {
      return NextResponse.json(
        { error: 'Threshold must be a non-negative number' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: body.menu_item_id || null,
        stock_level: body.stock_level,
        threshold: body.threshold,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to create inventory item' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiSuccess({ item: data }, requestId),
      { status: 201 }
    );
  } catch (error) {
    return await handleApiError(
      error,
      'inventory-create',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}
