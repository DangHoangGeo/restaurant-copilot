import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Schema for validating the request body when creating/updating a menu item
const menuItemSchema = z.object({
  category_id: z.string().uuid(),
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  description_en: z.string().max(500).optional(),
  description_ja: z.string().max(500).optional(),
  description_vi: z.string().max(500).optional(),
  price: z.number().min(0),
  image_url: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  weekday_visibility: z.array(z.number().min(1).max(7)).optional(),
  stock_level: z.number().min(0).optional(),
  position: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId") || "";
  console.log('GET menu items for restaurantId:', restaurantId);
  
  // Validate restaurantId parameter
  if (!restaurantId || restaurantId.trim() === '') {
    return NextResponse.json({ message: 'restaurantId parameter is required' }, { status: 400 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return NextResponse.json({ message: 'Invalid restaurantId format' }, { status: 400 });
  }

  try {
    // Use supabaseAdmin with explicit filtering - bypasses RLS
    const { data: menuItems, error } = await supabaseAdmin
      .from('menu_items')
      .select(`
        id,
        category_id,
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price,
        image_url,
        available,
        weekday_visibility,
        stock_level,
        position
      `)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true });
      
    if (error) {
      console.error('Error fetching menu items:', error);
      return NextResponse.json({ message: 'Error fetching menu items', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ menuItems }, { status: 200 });

  } catch (error) {
    console.error('API Error in GET menu items:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = menuItemSchema.safeParse(body);

    if (!validatedData.success) {
	  console.error('Validation error in POST menu item:', validatedData.error);
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }
	console.log('Validated data for menu item creation:', validatedData.data);

    const {
      category_id,
      name_en,
      name_ja,
      name_vi,
      description_en,
      description_ja,
      description_vi,
      price,
      image_url,
      available,
      weekday_visibility,
      stock_level,
      position
    } = validatedData.data;

    // Verify that the category belongs to the user's restaurant
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('restaurant_id')
      .eq('id', category_id)
      .single();

    if (categoryError || !category || category.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Invalid category or category does not belong to your restaurant' }, { status: 400 });
    }
	// Prepare the menu item data
	console.log('passing data to insert:')

    const menuItemData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      category_id,
      name_en,
      price,
      available: available ?? true,
      weekday_visibility: weekday_visibility ?? [1, 2, 3, 4, 5, 6, 7],
      position: position ?? 0,
    };

    // Add optional fields if they are provided
    if (name_ja !== undefined && name_ja.trim() !== '') {
      menuItemData.name_ja = name_ja;
    }
    if (name_vi !== undefined && name_vi.trim() !== '') {
      menuItemData.name_vi = name_vi;
    }
    if (description_en !== undefined && description_en.trim() !== '') {
      menuItemData.description_en = description_en;
    }
    if (description_ja !== undefined && description_ja.trim() !== '') {
      menuItemData.description_ja = description_ja;
    }
    if (description_vi !== undefined && description_vi.trim() !== '') {
      menuItemData.description_vi = description_vi;
    }
    if (image_url !== undefined && image_url && image_url.trim() !== '') {
      menuItemData.image_url = image_url;
    }
    if (stock_level !== undefined) {
      menuItemData.stock_level = stock_level;
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert([menuItemData])
      .select()
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      return NextResponse.json({ message: 'Error creating menu item', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Menu item created successfully', menuItem: data }, { status: 201 });

  } catch (error) {
    console.error('API Error in POST menu items:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}