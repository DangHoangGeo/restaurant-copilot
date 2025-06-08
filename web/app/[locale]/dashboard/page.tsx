import { DashboardClientContent, DashboardData } from './dashboard-client-content';
import { getTranslations } from 'next-intl/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings'; // Assuming this exists
import { headers } from 'next/headers';
import { RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable'; // Import the type
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { redirect } from 'next/navigation';
import { getSubdomainFromHost } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({locale, namespace: 'AdminDashboard'});
  const tCommon = await getTranslations({locale, namespace: 'Common'});

  const authUser = await getUserFromRequest();

  let restaurantIdFromSubdomainUrl: string | null = null;
  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  if (subdomain) {
    restaurantIdFromSubdomainUrl = await getRestaurantIdFromSubdomain(subdomain); // Implement this function
  }

  // Security Check
  if (!authUser) {
    // console.error("Security Alert: No authenticated user found. Cannot display dashboard."); // Production: use a proper logger
    return redirect(`/${locale}/login`);
  }

  if (!restaurantIdFromSubdomainUrl) {
    // console.log("Restaurant ID not found for subdomain, rendering error state."); // Production: use a proper logger
    return <DashboardClientContent initialData={null} recentOrders={[]} isLoading={false} error={t('errors.restaurant_not_found')} />;
  }

  if (authUser.restaurantId !== restaurantIdFromSubdomainUrl) {
    // console.error(`Security Alert: User ${authUser.userId} (Restaurant ID: ${authUser.restaurantId}) attempted to access dashboard for restaurant ${restaurantIdFromSubdomainUrl} via subdomain ${subdomain}.`); // Production: use a proper logger
    return <DashboardClientContent initialData={null} recentOrders={[]} isLoading={false} error={t('errors.mismatched_restaurant_access')} />;
  }
  
  let dashboardData: DashboardData | null = null;
  let recentOrdersData: RecentOrder[] = [];
  let fetchError: string | null = null;
  let isLoading = true;

  try {
    // --- Data Fetching (as per 04_admin-dashboard.md, using restaurantId) ---
    const today = new Date().toISOString().split("T")[0];

    // 1. Today's Total Sales
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantIdFromSubdomainUrl)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .eq('status', 'completed');

    if (salesError) throw salesError;
    const todaySales = salesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // 2. Active Orders Count
    const { count: activeOrdersCount, error: activeOrdersError } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantIdFromSubdomainUrl)
      .not('status', 'in', '("completed", "canceled")');
    
    if (activeOrdersError) throw activeOrdersError;

    // 3. Top-Selling Item Today
    // This is a simplified query. A more performant approach might use an RPC or a view.
    const { data: topSellerRaw, error: topSellerError } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        menu_items (id, name_en, name_ja, name_vi)
      `)
      .eq('restaurant_id', restaurantIdFromSubdomainUrl)
      // .filter('orders.created_at', 'gte', `${today}T00:00:00.000Z`) // Requires join with orders table
      // .filter('orders.created_at', 'lte', `${today}T23:59:59.999Z`)
      .limit(50);

    let topSellerTodayData: DashboardData['topSellerToday'] = null;
    if (topSellerError){
      // console.error("Error fetching top seller data:", topSellerError.message); // Production: use a proper logger
    } else if (topSellerRaw && topSellerRaw.length > 0) {
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
            const name = topItem.nameObj[locale] || topItem.nameObj.en || tCommon('unknown_item');
            topSellerTodayData = { name, metricValue: `${topItem.count} ${t('cards.sold_units')}` };
        }
    } else {
      topSellerTodayData = { name: t('cards.top_seller_unavailable'), metricValue: '' };
    }

    // 4. Low-Stock Alerts
    let lowStockItemsCount = 0;
    if (FEATURE_FLAGS.lowStockAlerts) {
      const { data: lowStockData, error: lowStockError } = await supabaseAdmin
        .from('inventory_items') // Ensure this table name and columns are correct
        .select('id, stock_level, threshold')
        .eq('restaurant_id', restaurantIdFromSubdomainUrl)
        // .lte('stock_level', 'threshold_column_name'); // If threshold is a column
        // If threshold is a fixed value or per-item, adjust query
      
      if (lowStockError) throw lowStockError;
      lowStockItemsCount = lowStockData?.filter(item => item.stock_level <= (item.threshold || 5)).length || 0;
    }
    
    dashboardData = {
      todaySales: todaySales,
      activeOrdersCount: activeOrdersCount || 0,
      topSellerToday: topSellerTodayData,
      lowStockItemsCount: lowStockItemsCount,
    };

    // Fetch Recent Orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, table_id, total_amount, status, created_at, tables (name)')
      .eq('restaurant_id', restaurantIdFromSubdomainUrl)
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
    
    // Simulate fetching items count for recent orders (this should be optimized in a real app, e.g., with an RPC or view)
    for (const order of recentOrdersData) {
        const { count, error: itemsCountError } = await supabaseAdmin
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);
        if (!itemsCountError && count !== null) {
            order.itemsCount = count;
        }
    }

  } catch (error) {
    // console.error("Error fetching dashboard data:", error); // Production: use a proper logger
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      fetchError = (error as { message: string }).message;
    } else {
      fetchError = t('errors.data_fetch_error');
    }
    dashboardData = { // Provide default structure on error
        todaySales: 0,
        activeOrdersCount: 0,
        topSellerToday: { name: t('cards.top_seller_unavailable'), metricValue: ''},
        lowStockItemsCount: 0,
    };
    recentOrdersData = [];
  } finally {
    isLoading = false;
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
