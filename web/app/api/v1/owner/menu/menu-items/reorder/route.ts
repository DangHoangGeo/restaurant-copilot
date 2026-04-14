import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { invalidateMenuCache } from '@/lib/server/request-context';

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
        category_id: z.string().uuid(),
      })
    )
    .min(1),
});

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing user or restaurant ID' },
      { status: 401 }
    );
  }

  const authError = checkAuthorization(user, 'menu_items', 'UPDATE');
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items } = parsed.data;
    const itemIds = items.map((i) => i.id);
    const categoryIds = Array.from(new Set(items.map((i) => i.category_id)));

    const [{ data: ownedItems, error: ownedItemsError }, { data: ownedCategories, error: ownedCategoriesError }] =
      await Promise.all([
        supabaseAdmin
          .from('menu_items')
          .select('id')
          .eq('restaurant_id', user.restaurantId)
          .in('id', itemIds),
        supabaseAdmin
          .from('categories')
          .select('id')
          .eq('restaurant_id', user.restaurantId)
          .in('id', categoryIds),
      ]);

    if (ownedItemsError || ownedCategoriesError) {
      return NextResponse.json(
        { error: 'Failed to verify ownership for reorder request' },
        { status: 500 }
      );
    }

    if ((ownedItems?.length ?? 0) !== itemIds.length || (ownedCategories?.length ?? 0) !== categoryIds.length) {
      return NextResponse.json(
        { error: 'One or more items/categories are invalid for this restaurant' },
        { status: 403 }
      );
    }

    const updates = items.map(({ id, position, category_id }) =>
      supabaseAdmin
        .from('menu_items')
        .update({ position, category_id })
        .eq('id', id)
        .eq('restaurant_id', user.restaurantId)
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json(
        { error: 'Failed to update one or more menu items', details: failed.error.message },
        { status: 500 }
      );
    }

    invalidateMenuCache(user.restaurantId);
    return NextResponse.json({ message: 'Menu items reordered successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
