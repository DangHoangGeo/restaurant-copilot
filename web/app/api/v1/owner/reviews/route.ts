import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/v1/owner/reviews
// Returns all reviews for this restaurant, newest first
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at, order_id, menu_item_id')
      .eq('restaurant_id', user.restaurantId)
      .order('created_at', { ascending: false })
      .limit(50);

    // If table doesn't exist yet, return empty array gracefully
    if (error?.code === '42P01') {
      return NextResponse.json({ reviews: [], total: 0 });
    }

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Calculate stats
    const reviews = data || [];
    const total = reviews.length;
    const averageRating = total > 0
      ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / total).toFixed(1)
      : 0;

    const fiveStarCount = reviews.filter((r: any) => r.rating === 5).length;
    const oneTwoStarCount = reviews.filter((r: any) => r.rating <= 2).length;

    return NextResponse.json({
      reviews,
      stats: {
        total,
        averageRating: parseFloat(averageRating as string),
        fiveStarCount,
        oneTwoStarCount,
      },
    });
  } catch (err) {
    console.error('Reviews API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
