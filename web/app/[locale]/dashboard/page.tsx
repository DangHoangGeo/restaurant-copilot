import { DashboardClientContent, DashboardData } from './dashboard-client-content';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'; // Your server Supabase client
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings'; // Assuming this exists
import { headers } from 'next/headers';
import { RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable'; // Import the type
import { FEATURE_FLAGS } from '@/config/feature-flags';

// Helper to get subdomain, this should be robust
function getSubdomainFromHost(host: string): string | null {
  
  const parts = host.split('.');
	// Determine root domain parts for production and handle localhost in development
	let rootDomainParts = (process.env.NEXT_PRIVATE_PRODUCTION_URL || 'qorder.jp').split('.').length;
	// If running on localhost, treat 'localhost' as the root domain
	if (host.includes('localhost')) {
		rootDomainParts = 1; // 'abc.localhost:3000' => ['abc', 'localhost:3000']
	}
	if (parts.length > rootDomainParts) {
		return parts[0];
	}

  return null;
}


export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({locale, namespace: 'AdminDashboard'});
  const supabase = createClient();

  let restaurantId: string | null = null;
  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  if (subdomain) {
    restaurantId = await getRestaurantIdFromSubdomain(subdomain); // Implement this function
  }

  if (!restaurantId) {
    // Handle case where restaurantId couldn't be determined
    // This might involve redirecting or showing an error specific to multi-tenancy setup
    console.log("Restaurant ID not found, rendering error state."); // Add this log
    return <DashboardClientContent initialData={null} recentOrders={[]} isLoading={false} error={t('errors.restaurant_not_found')} />;
  }
  
  let dashboardData: DashboardData | null = null;
  let recentOrdersData: RecentOrder[] = [];
  let fetchError: string | null = null;
  let isLoading = true;

  try {
    // --- Data Fetching (as per 04_admin-dashboard.md, using restaurantId) ---
    const today = new Date().toISOString().split("T")[0];

    // 1. Today's Total Sales (from analytics_snapshots)
    console.log("Fetching Today's Total Sales...");
    // For mockup, let's use a simplified sum from orders if analytics_snapshots is not populated yet.
    // In production, analytics_snapshots would be preferred.
    const { data: salesData, error: salesError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .eq('status', 'completed'); // Only completed orders for sales

    if (salesError) throw salesError;
    const todaySales = salesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    console.log("Today's Total Sales fetched:", todaySales);

    // 2. Active Orders Count
    console.log("Fetching Active Orders Count...");
    const { count: activeOrdersCount, error: activeOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("completed", "canceled")'); // Active = not completed or canceled
    
    if (activeOrdersError) throw activeOrdersError;
    console.log("Active Orders Count fetched:", activeOrdersCount);

    // 3. Top-Selling Item Today
    console.log("Fetching Top-Selling Item Today...");
    // This is a more complex query. For now, a placeholder.
    // You might need an RPC or a more detailed query joining order_items and menu_items.
    const { data: topSellerRaw, error: topSellerError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        menu_items (id, name_en, name_ja, name_vi)
      `)
      .eq('restaurant_id', restaurantId)
      // .filter('orders.created_at', 'gte', `${today}T00:00:00.000Z`) // Requires join with orders table
      // .filter('orders.created_at', 'lte', `${today}T23:59:59.999Z`)
      .limit(50); // Fetch recent items to aggregate

    let topSellerTodayData: DashboardData['topSellerToday'] = null;
    if (topSellerError){
      console.log("Error fetching top seller data:", topSellerError);
    }
    if (topSellerRaw && topSellerRaw.length > 0) {
        // Simplified aggregation: count occurrences of menu items
        interface NameObj {
          en?: string;
          ja?: string;
          vi?: string;
         [key: string]: string | undefined;
        }
        interface ItemCount {
          nameObj: NameObj;
          count: number;
        }
        const itemCounts: Record<string, ItemCount> = {};
        topSellerRaw.forEach(item => {
            // Assuming menu_items is an array of one object due to the select structure
            if (item.menu_items && item.menu_items.length > 0) {
                const menuItem = item.menu_items[0]; // Access the first element
                const id = menuItem.id;
                if (!itemCounts[id]) {
                    itemCounts[id] = { nameObj: {en: menuItem.name_en, ja: menuItem.name_ja, vi: menuItem.name_vi}, count: 0 };
                }
                itemCounts[id].count += item.quantity;
            }
        });
        const sortedItems = Object.values(itemCounts).sort((a, b) => b.count - a.count);
        if (sortedItems.length > 0) {
            const topItem = sortedItems[0];
            // Get localized name
            const name = topItem.nameObj[locale] || topItem.nameObj.en || 'Unknown Item';
            topSellerTodayData = { name, metricValue: `${topItem.count} ${t('cards.sold_units')}` };
        }
    } else {
      topSellerTodayData = { name: t('cards.top_seller_unavailable'), metricValue: '' };
    }
    console.log("Top-Selling Item Today fetched:", topSellerTodayData);


    // 4. Low-Stock Alerts
    console.log("Fetching Low-Stock Alerts...");
    let lowStockItemsCount = 0;
    if (FEATURE_FLAGS.lowStockAlerts) {
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('inventory_items') // Ensure this table name and columns are correct
        .select('id, stock_level, threshold')
        .eq('restaurant_id', restaurantId)
        // .lte('stock_level', 'threshold_column_name'); // If threshold is a column
        // If threshold is a fixed value or per-item, adjust query
      
      if (lowStockError) throw lowStockError;
      lowStockItemsCount = lowStockData?.filter(item => item.stock_level <= (item.threshold || 5)).length || 0;
    }
    console.log("Low-Stock Alerts fetched:", lowStockItemsCount);
    
    dashboardData = {
      todaySales: todaySales,
      activeOrdersCount: activeOrdersCount || 0,
      topSellerToday: topSellerTodayData,
      lowStockItemsCount: lowStockItemsCount,
    };
    console.log("Dashboard data compiled:", dashboardData);

    // Fetch Recent Orders
    console.log("Fetching Recent Orders...");
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_id, total_amount, status, created_at, tables (name)') // Join with tables to get table name
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5); // Get last 5 orders

    if (ordersError) throw ordersError;
    recentOrdersData = orders?.map(o => ({
      id: o.id,
      customerName: o.tables?.[0]?.name ? `${t('recent_orders.table_prefix')} ${o.tables[0].name}` : `Order ${o.id.substring(0,6)}`, // Use table name or fallback
      itemsCount: 0, // This would require joining order_items and counting, or a subquery. Placeholder for now.
      totalAmount: o.total_amount || 0,
      status: o.status as RecentOrder['status'],
      createdAt: new Date(o.created_at),
    })) || [];
    console.log("Recent Orders fetched (initial):", recentOrdersData.length);
    
    // Simulate fetching items count for recent orders (this should be optimized in a real app, e.g., with an RPC or view)
    for (const order of recentOrdersData) {
        const { count, error: itemsCountError } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);
        if (!itemsCountError && count !== null) {
            order.itemsCount = count;
        }
    }
    console.log("Recent Orders fetched (with item counts):", recentOrdersData.length);


  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      fetchError = (error as { message: string }).message;
    } else {
      fetchError = t('errors.data_fetch_error');
    }
    // Set dashboardData to some defaults or empty state if partial data is not useful
    dashboardData = {
        todaySales: 0,
        activeOrdersCount: 0,
        topSellerToday: { name: t('cards.top_seller_unavailable'), metricValue: ''},
        lowStockItemsCount: 0,
    };
    recentOrdersData = [];
    console.log("Dashboard data fetching failed. Error:", fetchError);
  } finally {
    isLoading = false;
    console.log("Dashboard data fetching complete. isLoading set to false.");
  }
      
  return (
    <DashboardClientContent
      initialData={dashboardData}
      recentOrders={recentOrdersData}
      isLoading={isLoading && !fetchError} // Only show loading if no error yet during initial phase
      error={fetchError}
    />
  );
}
