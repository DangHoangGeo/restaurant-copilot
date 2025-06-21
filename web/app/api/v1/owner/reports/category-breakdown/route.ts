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

    // Get category sales data
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        price_at_order,
        menu_items!inner(
          id,
          name_en,
          name_ja,
          name_vi,
          categories!inner(
            id,
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

    if (categoryError) {
      console.error('Error fetching category data:', categoryError);
      throw categoryError;
    }

    // Process category data
    const categoryMap = new Map<string, number>();
    let totalRevenue = 0;

    categoryData?.forEach(item => {
      // Access the menu item and its categories properly
      const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
      if (!menuItem || !menuItem.categories) return;
      
      const categories = Array.isArray(menuItem.categories) 
        ? menuItem.categories 
        : [menuItem.categories];
      
      categories.forEach((category: { id: string; name_en: string; name_ja: string; name_vi: string }) => {
        const categoryName = category.name_en || category.name_ja || category.name_vi || 'Other';
        const revenue = (item.quantity || 0) * (item.price_at_order || 0);
        
        totalRevenue += revenue;
        
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, 0);
        }
        
        categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + revenue);
      });
    });

    // Generate colors for categories
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280', // Gray
    ];

    // Convert to array and add percentages
    const result = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
