import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

export interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  min_threshold: number;
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

    // Query for low stock items
    const { data: lowStockItems, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        current_stock,
        min_threshold,
        price,
        categories(name_en, name_ja, name_vi)
      `)
      .eq('restaurant_id', user.restaurantId)
      .eq('is_available', true)
      .not('current_stock', 'is', null)
      .not('min_threshold', 'is', null)
      .filter('current_stock', 'lte', 'min_threshold');

    if (error) {
      console.error('Error fetching low stock items:', error);
      return NextResponse.json({ error: 'Failed to fetch low stock items' }, { status: 500 });
    }

    // Process the data and determine severity
    const processedItems: LowStockItem[] = (lowStockItems || []).map(item => {
      const stockRatio = item.current_stock / item.min_threshold;
      let severity: 'critical' | 'warning' | 'low';
      
      if (stockRatio <= 0.2) { // 20% or less of threshold
        severity = 'critical';
      } else if (stockRatio <= 0.5) { // 50% or less of threshold
        severity = 'warning';
      } else {
        severity = 'low';
      }

      // Get category name from the first category (since it's an array)
      const category = Array.isArray(item.categories) && item.categories.length > 0 
        ? (item.categories[0].name_en || item.categories[0].name_ja || item.categories[0].name_vi || 'Unknown')
        : 'Unknown';

      return {
        id: item.id,
        name: item.name,
        current_stock: item.current_stock,
        min_threshold: item.min_threshold,
        category,
        severity,
        price: item.price
      };
    });

    // Sort by severity (critical first) and then by stock ratio
    processedItems.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // If same severity, sort by stock ratio (lowest first)
      const ratioA = a.current_stock / a.min_threshold;
      const ratioB = b.current_stock / b.min_threshold;
      return ratioA - ratioB;
    });

    return NextResponse.json({ 
      success: true, 
      data: processedItems,
      count: processedItems.length
    });

  } catch (error) {
    console.error('Unexpected error in low-stock API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
