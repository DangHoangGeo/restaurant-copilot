import {  NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { invalidateMenuCache } from '@/lib/server/request-context';
import { logger } from '@/lib/logger';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { resolveScopedBranchRouteAccess } from '@/lib/server/organizations/branch-route';

// Schema for toppings
const toppingSchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  price: z.number().min(0),
  position: z.number().optional(),
});

// Schema for menu item sizes
const menuItemSizeSchema = z.object({
  size_key: z.string().min(1).max(50),
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  price: z.number().min(0),
  position: z.number().optional(),
});

// Schema for validating the request body when creating/updating a menu item
const menuItemSchema = z.object({
  category_id: z.string().uuid(),
  name_en: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional(),
  name_vi: z.string().max(100).optional(),
  description_en: z.string().max(500).optional(),
  description_ja: z.string().max(500).optional(),
  description_vi: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
  price: z.number().min(0),
  image_url: z.string().url().optional().nullable(),
  available: z.boolean().optional(),
  weekday_visibility: z.array(z.number().min(1).max(7)).optional(),
  stock_level: z.number().min(0).optional(),
  position: z.number().optional(),
  toppings: z.array(toppingSchema).optional(),
  sizes: z.array(menuItemSizeSchema).optional(),
});

export async function GET(req: Request) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  // Check authorization for menu_items SELECT
  const authError = checkAuthorization(user, 'menu_items', 'SELECT');
  if (authError) return authError;

  const requestedBranchId = new URL(req.url).searchParams.get('branchId') ?? user.restaurantId;
  const branchAccess = requestedBranchId
    ? await resolveScopedBranchRouteAccess(requestedBranchId)
    : null;

  if (!branchAccess) {
    return NextResponse.json({ error: 'Branch access denied' }, { status: 403 });
  }

  const restaurantId = branchAccess.branchId;

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
      `)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true });
      
    if (error) {
      await logger.error('menu-items-api-get', 'Error fetching menu items', {
        error: error.message,
        restaurantId
      }, restaurantId, user.userId);
      return NextResponse.json({ message: 'Error fetching menu items', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ menuItems }, { status: 200 });

  } catch (error) {
    await logger.error('menu-items-api-get', 'API Error in GET menu items', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId
    }, restaurantId, user?.userId);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  // Check authorization for menu_items INSERT
  const authError = checkAuthorization(user, 'menu_items', 'INSERT');
  if (authError) return authError;

  const requestedBranchId = new URL(req.url).searchParams.get('branchId') ?? user.restaurantId;
  const branchAccess = requestedBranchId
    ? await resolveScopedBranchRouteAccess(requestedBranchId)
    : null;

  if (!branchAccess) {
    return NextResponse.json({ error: 'Branch access denied' }, { status: 403 });
  }

  const restaurantId = branchAccess.branchId;

  try {
    const body = await req.json();
    const validatedData = menuItemSchema.safeParse(body);

    if (!validatedData.success) {
      await logger.error('menu-items-api-post', 'Validation error in POST menu item', {
        error: validatedData.error.message,
        restaurantId
      }, restaurantId, user.userId);
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      category_id,
      name_en,
      name_ja,
      name_vi,
      description_en,
      description_ja,
      description_vi,
      tags,
      price,
      image_url,
      available,
      weekday_visibility,
      stock_level,
      position,
      toppings,
      sizes
    } = validatedData.data;

    // Verify that the category belongs to the user's restaurant
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('restaurant_id')
      .eq('id', category_id)
      .single();

    if (categoryError || !category || category.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'Invalid category or category does not belong to your restaurant' }, { status: 400 });
    }
	// Prepare the menu item data

    const menuItemData: Record<string, unknown> = {
      restaurant_id: restaurantId,
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
    if (tags && tags.length > 0) {
      menuItemData.tags = tags;
    }

    // Start a transaction to create menu item and its related data
    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert([menuItemData])
      .select()
      .single();

    if (error) {
      await logger.error('menu-items-api-post', 'Error creating menu item', {
        error: error.message,
        restaurantId
      }, restaurantId, user.userId);
      return NextResponse.json({ message: 'Error creating menu item', details: error.message }, { status: 500 });
    }

    const menuItemId = data.id;

    // Insert toppings if provided
    if (toppings && toppings.length > 0) {
      const toppingsData = toppings.map((topping, index) => ({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        name_en: topping.name_en,
        name_ja: topping.name_ja || topping.name_en,
        name_vi: topping.name_vi || topping.name_en,
        price: topping.price,
        position: topping.position ?? index,
      }));

      const { error: toppingsError } = await supabaseAdmin
        .from('toppings')
        .insert(toppingsData);

      if (toppingsError) {
        await logger.error('menu-items-api-post', 'Error creating toppings', {
          error: toppingsError.message,
          restaurantId,
          menuItemId: menuItemId
        }, restaurantId, user.userId);
        // Clean up the menu item if toppings fail
        await supabaseAdmin.from('menu_items').delete().eq('id', menuItemId);
        return NextResponse.json({ message: 'Error creating toppings', details: toppingsError.message }, { status: 500 });
      }
    }

    // Insert sizes if provided
    if (sizes && sizes.length > 0) {
      const sizesData = sizes.map((size, index) => ({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        size_key: size.size_key,
        name_en: size.name_en,
        name_ja: size.name_ja || size.name_en,
        name_vi: size.name_vi || size.name_en,
        price: size.price,
        position: size.position ?? index,
      }));

      const { error: sizesError } = await supabaseAdmin
        .from('menu_item_sizes')
        .insert(sizesData);

      if (sizesError) {
        await logger.error('menu-items-api-post', 'Error creating sizes', {
          error: sizesError.message,
          restaurantId,
          menuItemId: menuItemId
        }, restaurantId, user.userId);
        // Clean up the menu item and toppings if sizes fail
        await supabaseAdmin.from('menu_items').delete().eq('id', menuItemId);
        return NextResponse.json({ message: 'Error creating sizes', details: sizesError.message }, { status: 500 });
      }
    }

    // Fetch the complete menu item with toppings and sizes
    const { data: completeMenuItem, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select(`
        *,
        toppings (*),
        menu_item_sizes (*)
      `)
      .eq('id', menuItemId)
      .single();

    if (fetchError) {
      await logger.error('menu-items-api-post', 'Error fetching complete menu item', {
        error: fetchError.message,
        restaurantId,
        menuItemId: menuItemId
      }, restaurantId, user.userId);
      return NextResponse.json({ message: 'Menu item created but error fetching complete data', details: fetchError.message }, { status: 500 });
    }

    // Invalidate menu cache since we created a new menu item
    invalidateMenuCache(restaurantId);

    return NextResponse.json({ message: 'Menu item created successfully', menuItem: completeMenuItem }, { status: 201 });

  } catch (error) {
    await logger.error('menu-items-api-post', 'API Error in POST menu items', {
      error: error instanceof Error ? error.message : 'Unknown error',
      restaurantId
    }, restaurantId, user?.userId);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknown error!" }, { status: 500 });
  }
}
