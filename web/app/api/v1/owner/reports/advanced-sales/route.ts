import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

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

    // Get daily sales data
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('orders')
      .select(`
        created_at,
        total_amount,
        status,
        order_items(quantity)
      `)
      .eq('restaurant_id', user.restaurantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .eq('status', 'completed');

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      throw salesError;
    }

    // Process data by day
    const salesByDay = new Map();
    const ordersByDay = new Map();

    salesData?.forEach(order => {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      const sales = order.total_amount || 0;
      
      if (!salesByDay.has(date)) {
        salesByDay.set(date, 0);
        ordersByDay.set(date, 0);
      }
      
      salesByDay.set(date, salesByDay.get(date) + sales);
      ordersByDay.set(date, ordersByDay.get(date) + 1);
    });

    // Generate complete date range with zero values for missing days
    const result = [];
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const sales = salesByDay.get(dateStr) || 0;
      const orders = ordersByDay.get(dateStr) || 0;
      const averageOrderValue = orders > 0 ? sales / orders : 0;
      
      result.push({
        date: dateStr,
        sales,
        orders,
        averageOrderValue
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching advanced sales data:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
