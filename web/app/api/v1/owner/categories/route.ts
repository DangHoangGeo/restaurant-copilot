import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { categoriesGetQuerySchema, createPaginationMeta } from '@/lib/utils/validation';
import { createApiSuccess, handleApiError } from '@/lib/server/apiError';
import { randomUUID } from 'crypto';

// Type definitions for Supabase response
interface CategoryWithItems {
  id: string;
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  position?: number;
  menu_items?: unknown[];
  items_count?: number;
}

// Schema for validating the request body when creating/updating a category
const categorySchema = z.object({
  name_en: z.string().min(1).max(50).optional(),
  name_ja: z.string().max(50).optional(),
  name_vi: z.string().max(50).optional(),
  position: z.number().optional().nullable(),
});

export async function GET(request: Request) {
  const requestId = randomUUID();
  let user: AuthUser | null = null;
  
  try {
    // Get user from authentication
    user = await getUserFromRequest();

    if (!user || !user.restaurantId) {
      return NextResponse.json({ message: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
    }

    // Check authorization for categories SELECT
    const authError = checkAuthorization(user, 'categories', 'SELECT');
    if (authError) return authError;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Check if this is a legacy request (no query params) for backward compatibility
    const isLegacyRequest = Object.keys(queryParams).length === 0;
    
    let validatedParams;
    if (isLegacyRequest) {
      // Use defaults for legacy requests
      validatedParams = {
        page: 1,
        pageSize: 1000, // Large number to get all categories
        include: ['items', 'sizes', 'toppings'], // Include everything like before
      };
    } else {
      const validationResult = categoriesGetQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid query parameters',
              requestId,
              details: validationResult.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }
      validatedParams = validationResult.data;
    }

    const { page, pageSize, include } = validatedParams;
    const restaurantId = user.restaurantId;

    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // Build select query based on include parameters
    let selectQuery = `
      id,
      name_en,
      name_ja,
      name_vi,
      position
    `;

    // Add counts if requested
    if (include.includes('counts')) {
      // We'll compute counts separately for better performance
    }

    // Add nested data if requested
    if (include.includes('items')) {
      selectQuery += `,
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
          position`;

      if (include.includes('sizes')) {
        selectQuery += `,
          menu_item_sizes (
            id,
            size_key,
            name_en,
            name_ja,
            name_vi,
            price,
            position
          )`;
      }

      if (include.includes('toppings')) {
        selectQuery += `,
          toppings (
            id,
            name_en,
            name_ja,
            name_vi,
            price,
            position
          )`;
      }

      selectQuery += `
        )`;
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (countError) {
      throw new Error(`Failed to get categories count: ${countError.message}`);
    }

    // Execute main query with pagination
    let query = supabaseAdmin
      .from('categories')
      .select(selectQuery)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Add ordering for nested tables if they are included
    if (include.includes('items')) {
      query = query.order('position', { foreignTable: 'menu_items', ascending: true });
      
      if (include.includes('sizes')) {
        query = query.order('position', { foreignTable: 'menu_items.menu_item_sizes', ascending: true });
      }
      
      if (include.includes('toppings')) {
        query = query.order('position', { foreignTable: 'menu_items.toppings', ascending: true });
      }
    }

    const { data: categories, error } = await query;
      
    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }

    // Add counts if requested
    let enhancedCategories: unknown[] | null = categories;
    if (include.includes('counts') && categories && Array.isArray(categories)) {
      const categoryIds = categories.map(cat => (cat as unknown as CategoryWithItems).id);
      
      if (categoryIds.length > 0) {
        // Get item counts for each category
        const { data: itemCounts } = await supabaseAdmin
          .from('menu_items')
          .select('category_id')
          .in('category_id', categoryIds)
          .eq('restaurant_id', restaurantId);

        // Create count map
        const countMap = new Map();
        itemCounts?.forEach(item => {
          countMap.set(item.category_id, (countMap.get(item.category_id) || 0) + 1);
        });

        // Add counts to categories
        enhancedCategories = categories.map(category => ({
          ...(category as unknown as CategoryWithItems),
          items_count: countMap.get((category as unknown as CategoryWithItems).id) || 0,
        }));
      }
    }

    // Return legacy format for backward compatibility
    if (isLegacyRequest) {
      return NextResponse.json(
        { categories: enhancedCategories },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=120', // Cache for 2 minutes
          },
        }
      );
    }

    // Create pagination metadata for new API format
    const pagination = createPaginationMeta(page, pageSize, totalCount || 0);

    const responseData = {
      categories: enhancedCategories,
      pagination,
      filters: {
        include,
      },
    };

    return NextResponse.json(
      createApiSuccess(responseData, requestId),
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=120', // Cache for 2 minutes
        },
      }
    );

  } catch (error) {
    return await handleApiError(
      error,
      'categories-get',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  let user: AuthUser | null = null;
  
  try {
    user = await getUserFromRequest();

    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
    }

    // Check authorization for categories INSERT
    const authError = checkAuthorization(user, 'categories', 'INSERT');
    if (authError) return authError;

    const body = await req.json();
    const validatedData = categorySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category data',
            requestId,
            details: validatedData.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name_en, name_ja, name_vi, position } = validatedData.data;

    // Ensure the category is created for the user's restaurant
    const primaryName = name_en;
    if (!primaryName) {
      throw new Error('Category name (name_en) is required');
    }

    const categoryData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      name_en: primaryName,
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
      // Check for specific errors
      if (error.code === '23505') { // Postgres unique violation
        throw new Error('A category with this name already exists');
      }
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return NextResponse.json(
      createApiSuccess({ category: data }, requestId),
      { status: 201 }
    );

  } catch (error) {
    return await handleApiError(
      error,
      'categories-post',
      user?.restaurantId || undefined,
      user?.userId || undefined,
      requestId
    );
  }
}
