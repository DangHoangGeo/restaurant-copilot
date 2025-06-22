import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface TopSellerResult {
  menu_item_id: string;
  name_en?: string;
  name_ja?: string;
  name_vi?: string;
  total_sold: number;
}

export interface PopularItem {
  menu_item_id: string;
  name: string;
  total_sold: number;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantId = user.restaurantId;

    // Try to use the database function first
    try {
      const { data: popularItemsData, error: rpcError } = await supabaseAdmin
        .rpc('get_top_sellers_7days', { 
          p_restaurant_id: restaurantId,
          p_limit: 5
        });

      if (!rpcError && popularItemsData && popularItemsData.length > 0) {
        const formattedItems: PopularItem[] = popularItemsData.map((item: TopSellerResult) => ({
          menu_item_id: item.menu_item_id,
          name: item.name_en || item.name_ja || item.name_vi || 'Unknown Item',
          total_sold: item.total_sold
        }));

        return NextResponse.json(formattedItems);
      }
    } catch (rpcError) {
      console.warn('RPC function not available, using fallback query:', rpcError);
    }

    // Fallback: Manual query for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: orderItemsData, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        menu_item_id,
        menu_items!inner (
          id,
          name_en,
          name_ja,
          name_vi
        ),
        orders!inner (
          restaurant_id,
          created_at,
          status
        )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', sevenDaysAgo.toISOString())
      .eq('orders.status', 'completed')
      .limit(100); // Limit for performance

    if (orderItemsError) {
      throw orderItemsError;
    }

    // Group by menu item and sum quantities
    const itemCounts: Record<string, { name: string; count: number }> = {};
    
    orderItemsData?.forEach(item => {
      if (item.menu_items) {
        const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
        const id = menuItem.id;
        const name = menuItem.name_en || menuItem.name_ja || menuItem.name_vi || 'Unknown Item';
        
        if (!itemCounts[id]) {
          itemCounts[id] = { name, count: 0 };
        }
        itemCounts[id].count += item.quantity;
      }
    });

    // Sort by count and take top 5
    const sortedItems = Object.entries(itemCounts)
      .map(([menu_item_id, data]) => ({
        menu_item_id,
        name: data.name,
        total_sold: data.count
      }))
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    return NextResponse.json(sortedItems);
  } catch (error) {
    console.error('Error fetching popular items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular items' }, 
      { status: 500 }
    );
  }
}
