import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ReorderedCategory {
  id: string;
  position: number;
}

// Placeholder for getting restaurant_id from user session or JWT
// In a real app, this would involve decoding a JWT or querying a session table
async function getRestaurantIdFromSession(supabase: any): Promise<string | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("Session error or no session:", sessionError);
    return null;
  }
  // Assuming you have a way to get restaurant_id from the user or session
  // For example, if it's in user_metadata or a custom claim in the JWT
  // Or if the user is directly linked to one restaurant_id
  // This is a placeholder, adapt to your actual authentication/session management
  return session.user?.user_metadata?.restaurant_id || "mock-restaurant-id-123"; // Replace with actual logic
}


export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const userRestaurantId = await getRestaurantIdFromSession(supabase);
    if (!userRestaurantId) {
      return NextResponse.json({ error: 'Unauthorized or restaurant ID not found in session' }, { status: 401 });
    }

    const reorderedCategories: ReorderedCategory[] = await req.json();

    // Basic validation
    if (!Array.isArray(reorderedCategories) || reorderedCategories.some(cat => !cat.id || typeof cat.position !== 'number')) {
      return NextResponse.json({ error: 'Invalid request body. Expected an array of {id: string, position: number}.' }, { status: 400 });
    }

    const updates = reorderedCategories.map(category =>
      supabase
        .from('categories')
        .update({ position: category.position })
        .eq('id', category.id)
        .eq('restaurant_id', userRestaurantId) // Ensure user can only update their own restaurant's categories
    );

    const results = await Promise.all(updates);

    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating category positions:', errors);
      // Consolidate error messages if needed, or just report the first one
      return NextResponse.json({ error: `Failed to update some categories: ${errors.map(e=>e.error?.message).join(', ')}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Categories reordered successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in reorder API:', error);
    if (error.name === 'SyntaxError') { // Handle JSON parsing error
        return NextResponse.json({ error: 'Invalid JSON format in request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
}
