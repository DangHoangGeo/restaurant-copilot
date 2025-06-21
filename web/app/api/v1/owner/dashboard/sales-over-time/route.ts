import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface SalesDataPoint {
  date: string;
  sales: number;
  orders_count: number;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantId = user.restaurantId;
    
    // Get last 7 days of data
    const salesData: SalesDataPoint[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Fetch daily sales and order count
      const { data: dailyOrders, error: dailyError } = await supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lte('created_at', `${dateStr}T23:59:59.999Z`)
        .eq('status', 'completed');

      if (dailyError) {
        console.error(`Error fetching data for ${dateStr}:`, dailyError);
        // Continue with 0 values if there's an error
        salesData.push({
          date: dateStr,
          sales: 0,
          orders_count: 0
        });
        continue;
      }

      const totalSales = dailyOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const ordersCount = dailyOrders?.length || 0;

      salesData.push({
        date: dateStr,
        sales: totalSales,
        orders_count: ordersCount
      });
    }

    return NextResponse.json(salesData);
  } catch (error) {
    console.error('Error fetching sales over time:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' }, 
      { status: 500 }
    );
  }
}
