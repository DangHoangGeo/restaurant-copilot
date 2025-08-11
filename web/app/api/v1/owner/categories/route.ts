import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess } from '@/lib/server/apiError';
import { createApiHandler, ApiHandlerContext } from '@/lib/server/apiHandler';
import { categoryCreateSchema, CategoryCreateData } from '@/shared/schemas/owner';
import { categoriesGetQuerySchema, createPaginationMeta } from '@/lib/utils/validation';

interface CategoryWithItems {
  id: string;
  // other category fields
  [key: string]: unknown;
}

// Refactored GET handler with restored functionality
export const GET = createApiHandler(
  {
    resource: 'categories',
    operation: 'SELECT',
  },
  async ({ user, req, requestId }: ApiHandlerContext<never>) => {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);

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

    const { page, pageSize, include } = validationResult.data;
    const restaurantId = user.restaurantId;
    const offset = (page - 1) * pageSize;

    // Restore complex select query
    let selectQuery = 'id, name_en, name_ja, name_vi, position';
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
      const categoryIds = categories.map(cat => (cat as CategoryWithItems).id);
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
          ...(category as CategoryWithItems),
          items_count: countMap.get((category as CategoryWithItems).id) || 0,
        }));
      }
    }

    const pagination = createPaginationMeta(page, pageSize, totalCount || 0);

    return NextResponse.json(
      createApiSuccess({ categories: enhancedCategories, pagination, filters: { include } }, requestId),
      { status: 200, headers: { 'Cache-Control': 'private, max-age=120' } }
    );
  }
);

// Refactored POST handler (no changes needed here)
export const POST = createApiHandler(
  {
    schema: categoryCreateSchema,
    resource: 'categories',
    operation: 'INSERT',
  },
  async ({ user, validatedData, requestId }: ApiHandlerContext<CategoryCreateData>) => {
    const { name_en, name_ja, name_vi, position } = validatedData;

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
  }
);
