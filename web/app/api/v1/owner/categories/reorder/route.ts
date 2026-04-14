import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkAuthorization } from '@/lib/server/rolePermissions';

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
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

  const authError = checkAuthorization(user, 'categories', 'UPDATE');
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
    const ids = items.map(i => i.id);

    // Verify all categories belong to this restaurant in one query
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('restaurant_id', user.restaurantId)
      .in('id', ids);

    if (ownedError) {
      return NextResponse.json(
        { error: 'Failed to verify category ownership' },
        { status: 500 }
      );
    }

    const ownedIds = new Set((owned ?? []).map(c => c.id));
    if (ownedIds.size !== ids.length) {
      return NextResponse.json(
        { error: 'One or more categories not found or do not belong to your restaurant' },
        { status: 403 }
      );
    }

    // Update each category position. Supabase doesn't support bulk update with
    // different values per row, so we use Promise.all for concurrency.
    const updates = items.map(({ id, position }) =>
      supabaseAdmin
        .from('categories')
        .update({ position })
        .eq('id', id)
        .eq('restaurant_id', user.restaurantId)
    );

    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed?.error) {
      return NextResponse.json(
        { error: 'Failed to update one or more category positions', details: failed.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Categories reordered successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
