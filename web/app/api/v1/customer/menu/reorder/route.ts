import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
interface ReorderedCategory {
  id: string;
  position: number;
}


export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized or restaurant ID not found in session' }, { status: 401 });
    }
    const authError = checkAuthorization(user, 'categories', 'UPDATE');
    if (authError) {
      return authError;
    }

    const reorderedCategories: ReorderedCategory[] = await req.json();

    // Basic validation
    if (!Array.isArray(reorderedCategories) || reorderedCategories.some(cat => !cat.id || typeof cat.position !== 'number')) {
      return NextResponse.json({ error: 'Invalid request body. Expected an array of {id: string, position: number}.' }, { status: 400 });
    }

    const updates = reorderedCategories.map(category =>
      supabaseAdmin
        .from('categories')
        .update({ position: category.position })
        .eq('id', category.id)
        .eq('restaurant_id', user.restaurantId)
    );

    const results = await Promise.all(updates);

    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating category positions:', errors);
      // Consolidate error messages if needed, or just report the first one
      return NextResponse.json({ error: `Failed to update some categories: ${errors.map(e=>e.error?.message).join(', ')}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Categories reordered successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error in reorder API:', error);
    if ((error as Error).name === 'SyntaxError') { // Handle JSON parsing error
        return NextResponse.json({ error: 'Invalid JSON format in request body.' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
