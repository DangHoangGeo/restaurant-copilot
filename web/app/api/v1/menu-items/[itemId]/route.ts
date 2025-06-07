import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Schema for validating the request body when updating a menu item
const menuItemUpdateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(100).optional(),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  description_en: z.string().max(500).optional(),
  description_ja: z.string().max(500).optional(),
  description_vi: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  weekday_visibility: z.array(z.number().min(1).max(7)).optional(),
  stock_level: z.number().min(0).optional(),
  position: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  const { itemId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json({ error: 'Invalid menu item ID format' }, { status: 400 });
  }

  try {
    const body = await req.json();
	console.log('Update body:', body);
    const validatedData = menuItemUpdateSchema.safeParse(body);

    if (!validatedData.success) {
	  console.error('Validation error:', validatedData.error);
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const updateData = validatedData.data;
	console.log('Update data:', updateData);
    // If category_id is being updated, verify it belongs to the user's restaurant
    if (updateData.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('categories')
        .select('restaurant_id')
        .eq('id', updateData.category_id)
        .single();

      if (categoryError || !category || category.restaurant_id !== user.restaurantId) {
        return NextResponse.json({ error: 'Invalid category or category does not belong to your restaurant' }, { status: 400 });
      }
    }

    // First verify the menu item exists and belongs to the user's restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem || existingItem.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Menu item not found or does not belong to your restaurant' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('restaurant_id', user.restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return NextResponse.json({ message: 'Error updating menu item', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Menu item updated successfully', menuItem: data }, { status: 200 });

  } catch (error) {
    console.error('API Error in PUT menu item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
	console.log("req", req);
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  const { itemId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json({ error: 'Invalid menu item ID format' }, { status: 400 });
  }

  try {
    // First verify the menu item exists and belongs to the user's restaurant
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem || existingItem.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Menu item not found or does not belong to your restaurant' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('restaurant_id', user.restaurantId);

    if (error) {
      console.error('Error deleting menu item:', error);
      return NextResponse.json({ message: 'Error deleting menu item', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Menu item deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('API Error in DELETE menu item:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}