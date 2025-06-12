import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Schema for validating the request body when creating/updating a category
const categorySchema = z.object({
  name_en: z.string().min(1).max(50).optional(),
  name_ja: z.string().max(50).optional(),
  name_vi: z.string().max(50).optional(),
  position: z.number().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId") || "";
  console.log('GET categories for restaurantId:', restaurantId);
  
  // Validate restaurantId parameter
  if (!restaurantId || restaurantId.trim() === '') {
    return NextResponse.json({ message: 'restaurantId parameter is required' }, { status: 400 });
  }

  // Validate UUID format (basic validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return NextResponse.json({ message: 'Invalid restaurantId format' }, { status: 400 });
  }

  try {
    // Use supabaseAdmin with explicit filtering - bypasses RLS
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select(`
        id,
        name_en,
        name_ja,
        name_vi,
        position,
        menu_items (
          id,
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
          position,
          toppings (
            id,
            name_en,
            name_ja,
            name_vi,
            price,
            position
          ),
          menu_item_sizes (
            id,
            size_key,
            name_en,
            name_ja,
            name_vi,
            price,
            position
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true })
      .order('position', { foreignTable: 'menu_items', ascending: true })
      .order('position', { foreignTable: 'menu_items.toppings', ascending: true })
      .order('position', { foreignTable: 'menu_items.menu_item_sizes', ascending: true });
      
    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ message: 'Error fetching categories', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories }, { status: 200 });

  } catch (error) {
    console.error('API Error in GET categories:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  // TODO: Add role-based authorization check here if necessary
  // e.g., fetch user role from an 'employees' table linked to user.userId
  // and check if they have 'owner' or 'manager' roles for user.restaurantId.
  // For now, proceeding if user is associated with the restaurant.

  try {
    const body = await req.json();
    const validatedData = categorySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name_en, name_ja, name_vi, position } = validatedData.data;

    // Ensure the category is created for the user's restaurant
    // Use name_en as primary, fallback to name if provided
    const primaryName = name_en;
    if (!primaryName) {
        return NextResponse.json({ error: 'Category name (name_en or name) is required.' }, { status: 400 });
    }

    const categoryData: Record<string, unknown> = {
        restaurant_id: user.restaurantId, // Use authenticated user's restaurant ID
        name_en: primaryName, // Use name_en as primary
    };

    // Add optional fields if they are provided and not empty
    if (name_ja !== undefined && name_ja.trim() !== '') {
        categoryData.name_ja = name_ja;
    }
    if (name_vi !== undefined && name_vi.trim() !== '') {
        categoryData.name_vi = name_vi;
    }
    if (position !== undefined && position !== null) {
        categoryData.position = position;
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      // Check for specific errors, e.g., unique constraint violation if a category with the same name already exists
      if (error.code === '23505') { // Postgres unique violation
        return NextResponse.json({ message: 'Error creating category: A category with this name may already exist.', details: error.message }, { status: 409 }); // 409 Conflict
      }
      return NextResponse.json({ message: 'Error creating category', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Category created successfully', category: data }, { status: 201 });

  } catch (error) {
    console.error('API Error in POST categories:', error);
    if (error instanceof z.ZodError) { // Should be caught by safeParse, but as a fallback
        return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}
