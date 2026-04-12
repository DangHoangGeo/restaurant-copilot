import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const periodParam = searchParams.get('period') || 'last7days';

    // Calculate date range
    let fromDate: Date;
    let toDate: Date;

    if (fromParam && toParam) {
      fromDate = startOfDay(new Date(fromParam));
      toDate = endOfDay(new Date(toParam));
    } else {
      // Use period parameter
      switch (periodParam) {
        case 'today':
          fromDate = startOfDay(new Date());
          toDate = endOfDay(new Date());
          break;
        case 'yesterday':
          fromDate = startOfDay(subDays(new Date(), 1));
          toDate = endOfDay(subDays(new Date(), 1));
          break;
        case 'last7days':
          fromDate = startOfDay(subDays(new Date(), 6));
          toDate = endOfDay(new Date());
          break;
        case 'last30days':
          fromDate = startOfDay(subDays(new Date(), 29));
          toDate = endOfDay(new Date());
          break;
        default:
          fromDate = startOfDay(subDays(new Date(), 6));
          toDate = endOfDay(new Date());
      }
    }

    // Get detailed items data
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        price_at_order,
        menu_items!inner(
          id,
          name_en,
          name_ja,
          name_vi,
          image_url,
          categories!inner(
            name_en,
            name_ja,
            name_vi
          )
        ),
        orders!inner(
          restaurant_id,
          created_at,
          status
        )
      `)
      .eq('orders.restaurant_id', user.restaurantId)
      .gte('orders.created_at', fromDate.toISOString())
      .lte('orders.created_at', toDate.toISOString())
      .eq('orders.status', 'completed');

    if (itemsError) {
      console.error('Error fetching items data:', itemsError);
      throw itemsError;
    }

    // Get reviews data for average ratings
    const { data: reviewsData, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select(`
        menu_item_id,
        rating
      `)
      .eq('restaurant_id', user.restaurantId);

    if (reviewsError) {
      console.error('Error fetching reviews data:', reviewsError);
    }

    // Process items data
    const itemsMap = new Map();
    const reviewsMap = new Map();

    // Process reviews
    reviewsData?.forEach(review => {
      if (!reviewsMap.has(review.menu_item_id)) {
        reviewsMap.set(review.menu_item_id, []);
      }
      reviewsMap.get(review.menu_item_id).push(review.rating);
    });

    // Process order items
    itemsData?.forEach(item => {
      const menuItem = item.menu_items[0] || item.menu_items;
	  const orders = item.orders[0] || item.orders;
      const itemId = menuItem.id;
      const quantity = item.quantity || 0;
      const price = item.price_at_order || 0;
      const revenue = quantity * price;
      
      if (!itemsMap.has(itemId)) {
        const categoryName = menuItem.categories[0]?.name_en || 
                           menuItem.categories[0]?.name_ja || 
                           menuItem.categories[0]?.name_vi || 
                           'Other';
        
        itemsMap.set(itemId, {
          id: itemId,
          name: menuItem.name_en || menuItem.name_ja || menuItem.name_vi || 'Unknown',
          category: categoryName,
          totalSold: 0,
          revenue: 0,
          imageUrl: menuItem.image_url,
          lastOrderDate: orders.created_at
        });
      }
      
      const existing = itemsMap.get(itemId);
      existing.totalSold += quantity;
      existing.revenue += revenue;
      
      // Update last order date if this one is more recent
      if (new Date(orders.created_at) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = orders.created_at;
      }
    });

    // Convert to array and add calculated fields
    const result = Array.from(itemsMap.values()).map((item, index) => {
      const reviews = reviewsMap.get(item.id) || [];
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum: number, rating: number) => sum + rating, 0) / reviews.length 
        : 0;
      
      // Cost-per-item (COGS) is not tracked in the schema yet.
      // Return null so consumers can render an explicit "N/A" state instead of a
      // misleading 0.0% figure that would distort owner and accountant reports.
      const profitMargin: null = null;

      return {
        ...item,
        avgRating,
        reviewCount: reviews.length,
        profitMargin,
        popularityRank: index + 1
      };
    });

    // Sort by revenue (descending) and assign popularity ranks
    result.sort((a, b) => b.revenue - a.revenue);
    result.forEach((item, index) => {
      item.popularityRank = index + 1;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching items report:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
