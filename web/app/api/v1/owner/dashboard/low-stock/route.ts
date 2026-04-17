import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import {
  mapInventoryRowsToLowStockItems,
  type DashboardLowStockItem,
  type InventoryLowStockRow,
} from '@/lib/server/dashboard/low-stock';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Query inventory_items joined with menu_items and categories.
    // PostgREST does not support column-to-column comparisons in filters, so
    // we fetch all non-null inventory rows and filter stock_level < threshold in JS.
    const { data: inventoryData, error } = await supabase
      .from('inventory_items')
      .select(`
        id,
        stock_level,
        threshold,
        menu_items!inner (
          id,
          name_ja,
          name_en,
          name_vi,
          price,
          available,
          categories!inner (name_en, name_ja, name_vi)
        )
      `)
      .eq('restaurant_id', user.restaurantId)
      .not('stock_level', 'is', null)
      .not('threshold', 'is', null);

    if (error) {
      console.error('Error fetching inventory items:', error);
      return NextResponse.json({ error: 'Failed to fetch low stock items' }, { status: 500 });
    }

    // Filter to items where stock_level is below threshold
    const belowThreshold = (inventoryData || []).filter(
      item => item.stock_level < item.threshold
    );

    const processedItems: DashboardLowStockItem[] = mapInventoryRowsToLowStockItems(
      belowThreshold as InventoryLowStockRow[]
    );

    return NextResponse.json({
      success: true,
      data: processedItems,
      count: processedItems.length,
    });
  } catch (error) {
    console.error('Unexpected error in low-stock API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
