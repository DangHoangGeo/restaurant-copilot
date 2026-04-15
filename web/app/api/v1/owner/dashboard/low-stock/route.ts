import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { notifyLowStock } from '@/lib/server/notifications/email';

export interface LowStockItem {
  id: string;
  name: string;
  stock_level: number;
  threshold: number;
  category: string;
  severity: 'critical' | 'warning' | 'low';
  price?: number;
}

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

    const processedItems: LowStockItem[] = belowThreshold.map(item => {
      const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
      const stockRatio = item.threshold > 0 ? item.stock_level / item.threshold : 0;

      let severity: 'critical' | 'warning' | 'low';
      if (stockRatio <= 0.2) {
        severity = 'critical';
      } else if (stockRatio <= 0.5) {
        severity = 'warning';
      } else {
        severity = 'low';
      }

      const cats = Array.isArray(menuItem?.categories) ? menuItem.categories : [menuItem?.categories];
      const category =
        cats[0]?.name_en || cats[0]?.name_ja || cats[0]?.name_vi || 'Unknown';

      const name =
        menuItem?.name_en || menuItem?.name_ja || menuItem?.name_vi || 'Unknown';

      return {
        id: item.id,
        name,
        stock_level: item.stock_level,
        threshold: item.threshold,
        category,
        severity,
        price: menuItem?.price,
      };
    });

    // Sort by severity (critical first), then by stock ratio ascending
    processedItems.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      const ratioA = a.threshold > 0 ? a.stock_level / a.threshold : 0;
      const ratioB = b.threshold > 0 ? b.stock_level / b.threshold : 0;
      return ratioA - ratioB;
    });

    // Send notifications for critical items only (if enabled)
    const shouldNotify = process.env.NOTIFY_LOW_STOCK === 'true';
    if (shouldNotify && processedItems.length > 0) {
      try {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('email, name')
          .eq('id', user.restaurantId)
          .single();

        if (restaurant?.email) {
          const criticalItems = processedItems.filter(item => item.severity === 'critical');
          if (criticalItems.length > 0) {
            await notifyLowStock({
              restaurantEmail: restaurant.email,
              restaurantName: restaurant.name || 'Your Restaurant',
              items: criticalItems.map(item => ({
                name: item.name,
                currentStock: item.stock_level,
                threshold: item.threshold,
                unit: 'units',
              })),
            }).catch(err => console.error('[Low stock notification error]', err));
          }
        }
      } catch (notificationError) {
        console.error('Error preparing low stock notifications:', notificationError);
        // Continue regardless of notification errors
      }
    }

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
