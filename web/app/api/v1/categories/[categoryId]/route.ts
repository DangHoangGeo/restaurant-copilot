import {  NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Schema for validating the request body when updating a category
const categoryUpdateSchema = z.object({
  name_en: z.string().min(1).max(50).optional(),
  name_ja: z.string().max(50).optional(),
  name_vi: z.string().max(50).optional(),
  position: z.number().optional(),
});

export async function PUT(req: Request,{ params }: { params: Promise<{ categoryId: string }> }) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  const { categoryId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = categoryUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    // First verify the category exists and belongs to the user's restaurant
    const { data: existingCategory, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory || existingCategory.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Category not found or does not belong to your restaurant' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(validatedData.data)
      .eq('id', categoryId)
      .eq('restaurant_id', user.restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json({ message: 'Error updating category', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Category updated successfully', category: data }, { status: 200 });

  } catch (error) {
    console.error('API Error in PUT category:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
	console.log("req", req);
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  const { categoryId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 });
  }

  try {
    // First verify the category exists and belongs to the user's restaurant
    const { data: existingCategory, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory || existingCategory.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Category not found or does not belong to your restaurant' }, { status: 404 });
    }

    // Check if there are any menu items in this category
    const { data: menuItems, error: menuItemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (menuItemsError) {
      console.error('Error checking for menu items:', menuItemsError);
      return NextResponse.json({ message: 'Error checking category contents', details: menuItemsError.message }, { status: 500 });
    }

    if (menuItems && menuItems.length > 0) {
      return NextResponse.json({ error: 'Cannot delete category that contains menu items. Please delete or move all menu items first.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('restaurant_id', user.restaurantId);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ message: 'Error deleting category', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('API Error in DELETE category:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}