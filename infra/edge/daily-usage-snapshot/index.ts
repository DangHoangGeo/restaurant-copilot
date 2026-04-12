// Supabase Edge Function: Daily Usage Snapshot Calculation
// Scheduled via Supabase cron to run daily at 1 AM (Asia/Tokyo)
// Computes per-restaurant daily metrics and upserts into analytics_snapshots.
//
// Phase 0 fix: the previous version called calculate_daily_usage_snapshot RPC
// which does not exist in the schema. This version computes directly from orders
// and order_items and writes to the analytics_snapshots table.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Restaurant {
  id: string;
  name: string;
}

interface OrderItem {
  menu_item_id: string;
  quantity: number;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);

    // All date math is done in JST (UTC+9) because the restaurants operate in Japan.
    // Supabase stores timestamps in UTC, so query bounds are expressed with +09:00 so
    // Postgres converts them correctly — no orders are mis-bucketed across days.
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowJst = new Date(Date.now() + JST_OFFSET_MS);
    const yesterdayJst = new Date(nowJst.getTime() - 86400000);
    // Format as YYYY-MM-DD using the JST wall-clock date (not UTC)
    const jstYesterday = yesterdayJst.toISOString().split('T')[0];

    const targetDate = url.searchParams.get('date') || jstYesterday;

    console.log(`Calculating usage snapshots for ${targetDate} (JST)`);

    // Bounds expressed in JST so that the full local day is captured.
    const dayStart = `${targetDate}T00:00:00+09:00`;
    const dayEnd = `${targetDate}T23:59:59.999+09:00`;

    // Get all active restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('is_active', true);

    if (restaurantsError) {
      throw new Error(`Failed to fetch restaurants: ${restaurantsError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active restaurants found', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${restaurants.length} active restaurants`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurants as Restaurant[]) {
      try {
        // Fetch completed orders for this restaurant on the target day
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_amount')
          .eq('restaurant_id', restaurant.id)
          .eq('status', 'completed')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);

        if (ordersError) throw new Error(ordersError.message);

        const ordersCount = orders?.length ?? 0;
        const totalSales = orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;

        // Find top-selling menu item by total quantity in completed orders for the day
        let topSellerItem: string | null = null;
        if (ordersCount > 0) {
          const orderIds = orders!.map(o => o.id);

          const { data: itemRows, error: itemsError } = await supabase
            .from('order_items')
            .select('menu_item_id, quantity')
            .in('order_id', orderIds);

          if (itemsError) {
            console.error(`Error fetching order items for ${restaurant.name}:`, itemsError);
          } else if (itemRows && itemRows.length > 0) {
            const totals = new Map<string, number>();
            for (const row of itemRows as OrderItem[]) {
              totals.set(row.menu_item_id, (totals.get(row.menu_item_id) ?? 0) + row.quantity);
            }
            let maxQty = 0;
            for (const [itemId, qty] of totals) {
              if (qty > maxQty) {
                maxQty = qty;
                topSellerItem = itemId;
              }
            }
          }
        }

        // Upsert into analytics_snapshots
        const { error: upsertError } = await supabase
          .from('analytics_snapshots')
          .upsert(
            {
              restaurant_id: restaurant.id,
              date: targetDate,
              total_sales: totalSales,
              orders_count: ordersCount,
              top_seller_item: topSellerItem,
            },
            { onConflict: 'restaurant_id,date' }
          );

        if (upsertError) throw new Error(upsertError.message);

        successCount++;
        results.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'success',
          orders_count: ordersCount,
          total_sales: totalSales,
        });
      } catch (err) {
        console.error(`Error processing ${restaurant.name}:`, err);
        errorCount++;
        results.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    console.log(`Completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        total_restaurants: restaurants.length,
        processed: successCount,
        errors: errorCount,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Fatal error in daily-usage-snapshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
