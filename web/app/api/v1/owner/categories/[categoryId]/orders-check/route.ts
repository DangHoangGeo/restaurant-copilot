import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkAuthorization } from '@/lib/server/rolePermissions';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
): Promise<NextResponse> {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authError = checkAuthorization(user, 'categories', 'SELECT');
  if (authError) return authError;

  const { categoryId } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 });
  }

  try {
    // Single existence check query via join.
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .select('id, menu_items!inner(id)')
      .eq('restaurant_id', user.restaurantId)
      .eq('menu_items.category_id', categoryId)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: 'Failed to check orders' }, { status: 500 });
    }

    return NextResponse.json({ hasOrders: (data?.length ?? 0) > 0 }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
