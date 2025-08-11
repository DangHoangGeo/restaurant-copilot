import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess } from '@/lib/server/apiError';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { protectEndpoint, RATE_LIMIT_CONFIGS } from '@/lib/server/rateLimit';
import { handleApiError } from '@/lib/server/apiError';
import { categoryCreateSchema } from '@/shared/schemas/owner';
import { categoriesGetQuerySchema, createPaginationMeta } from '@/lib/utils/validation';
import { randomUUID } from 'crypto';

interface CategoryWithItems {
  id: string;
  // other category fields
  [key: string]: unknown;
}

// GET handler with restored functionality
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  let user: AuthUser | null = null;

  try {
    // 1. Rate Limiting & CSRF Protection
    const protectionError = await protectEndpoint(req, RATE_LIMIT_CONFIGS.QUERY, 'categories', requestId);
    if (protectionError) {
      return protectionError;
    }

    // 2. Authentication
    user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated or missing restaurant ID',
          requestId,
        },
      }, { status: 401 });
    }

    // 3. Authorization
    const authError = await checkAuthorization(user, 'categories', 'SELECT');
    if (authError) {
      return authError;
    }
    // 4. Parse query parameters
    const url = new URL(req.url);
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
    const offset = (page - 1) * pageSize;

    // Build select query based on include parameters
    let selectQuery = `
      id,
      name_en,
      name_ja,
      name_vi,
      position
    `;

    if (include.includes('items')) {
      selectQuery += `, menu_items(id, name_en, name_ja, name_vi, description_en, description_ja, description_vi, price, image_url, available, weekday_visibility, stock_level, position`;
      if (include.includes('sizes')) {
        selectQuery += `, menu_item_sizes(id, size_key, name_en, name_ja, name_vi, price, position)`;
      }
      if (include.includes('toppings')) {
        selectQuery += `, toppings(id, name_en, name_ja, name_vi, price, position)`;
      }
      selectQuery += `)`;
    }

    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (countError) {
      throw new Error(`Failed to get categories count: ${countError.message}`);
    }

    let query = supabaseAdmin
      .from('categories')
      .select(selectQuery)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Restore nested ordering
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

    // Restore item counts logic
    let enhancedCategories: unknown[] | null = categories;
    if (include.includes('counts') && categories && Array.isArray(categories)) {
      const categoryIds = categories.map(cat => (cat as unknown as CategoryWithItems).id);
      if (categoryIds.length > 0) {
        const { data: itemCounts } = await supabaseAdmin
          .from('menu_items')
          .select('category_id')
          .in('category_id', categoryIds)
          .eq('restaurant_id', restaurantId);

        const countMap = new Map();
        itemCounts?.forEach(item => {
          countMap.set(item.category_id, (countMap.get(item.category_id) || 0) + 1);
        });

        enhancedCategories = categories.map(category => ({
          ...(category as unknown as CategoryWithItems),
          items_count: countMap.get((category as unknown as CategoryWithItems).id) || 0,
        }));
      }
    }

    const pagination = createPaginationMeta(page, pageSize, totalCount || 0);

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

    return NextResponse.json(
      createApiSuccess({ categories: enhancedCategories, pagination, filters: { include } }, requestId),
      { status: 200, headers: { 'Cache-Control': 'private, max-age=120' } }
    );

  } catch (error) {
    return await handleApiError(
      error,
      'categories-select',
      user?.restaurantId || undefined,
      user?.userId,
      requestId
    );
  }
}

// POST handler
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  let user: AuthUser | null = null;

  try {
    // 1. Rate Limiting & CSRF Protection
    const protectionError = await protectEndpoint(req, RATE_LIMIT_CONFIGS.MUTATION, 'categories', requestId);
    if (protectionError) {
      return protectionError;
    }

    // 2. Authentication
    user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated or missing restaurant ID',
          requestId,
        },
      }, { status: 401 });
    }

    // 3. Authorization
    const authError = await checkAuthorization(user, 'categories', 'INSERT');
    if (authError) {
      return authError;
    }

    // 4. Validate request data
    const requestData = await req.json();
    const validationResult = categoryCreateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            requestId,
            details: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name_en, name_ja, name_vi, position } = validationResult.data;

    const categoryData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      name_en,
    };

    if (name_ja) categoryData.name_ja = name_ja;
    if (name_vi) categoryData.name_vi = name_vi;
    if (position !== undefined && position !== null) categoryData.position = position;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A category with this name already exists');
      }
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return NextResponse.json(createApiSuccess({ category: data }, requestId), { status: 201 });

  } catch (error) {
    return await handleApiError(
      error,
      'categories-insert',
      user?.restaurantId || undefined,
      user?.userId,
      requestId
    );
  }
}
