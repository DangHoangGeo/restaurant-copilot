import ReportPageClient from "../../../../components/ReportPageClient"; // Adjust path
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";
import { format, subDays } from 'date-fns'; // For date manipulation

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for reports page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

export interface DailySale {
  date: string; // YYYY-MM-DD
  total_sales: number;
}

export interface CategorySale {
  category_name: string;
  total_sales: number;
}

export interface ItemsReportDataItem {
  item_id: string;
  name_ja: string | null; // From menu_items join within RPC
  name_en: string | null; // From menu_items join within RPC
  name_vi: string | null; // From menu_items join within RPC
  total_sold: number;
  total_revenue: number;
  avg_rating: number | null;
}

export interface ReportPageData {
  // Card data
  totalSalesToday: number;
  activeOrdersCount: number;
  topSellerNameToday: string;
  lowStockCount: number;
  // Sales report data (default: last 7 days)
  dailySales7Days: DailySale[];
  categorySales7Days: CategorySale[];
  // Items report data
  itemsReportData: ItemsReportDataItem[];
}


interface ReportsPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component for async data fetching
async function ReportsLoader({ params, searchParams }: ReportsPageProps) {
  const supabase = createServerActionClient({ cookies });
  const restaurantId = await getRestaurantId(searchParams);
  const { locale } = params;
  const today = format(new Date(), 'yyyy-MM-dd');
  const dateFrom7Days = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }

  // --- Data for Dashboard Cards ---
  let totalSalesToday = 0;
  const { data: salesSnapshot, error: salesError } = await supabase
    .from("analytics_snapshots")
    .select("total_sales")
    .eq("restaurant_id", restaurantId)
    .eq("date", today)
    .maybeSingle();
  if (salesError) console.error("Error fetching sales snapshot:", salesError.message);
  if (salesSnapshot?.total_sales) totalSalesToday = salesSnapshot.total_sales;
   else if (!salesError) {
      const { data: dailyOrdersFallback, error: ordersErrorFallback } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('restaurant_id', restaurantId)
          .eq('status', 'completed')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lte('created_at', `${today}T23:59:59.999Z`);
      if (ordersErrorFallback) console.error("Error fetching daily orders for sales fallback:", ordersErrorFallback.message);
      if (dailyOrdersFallback) totalSalesToday = dailyOrdersFallback.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  }

  const { count: activeOrdersCount, error: activeOrdersError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .not("status", "in", "(completed,cancelled)");
  if (activeOrdersError) console.error("Error fetching active orders count:", activeOrdersError.message);

  let topSellerNameToday = "N/A";
  const { data: topSellerSnapshot, error: topSellerError } = await supabase
    .from("analytics_snapshots")
    .select("top_seller_item_id, menu_items(name_en, name_ja, name_vi)")
    .eq("restaurant_id", restaurantId)
    .eq("date", today)
    .maybeSingle();
  if (topSellerError) console.error("Error fetching top seller snapshot:", topSellerError.message);
  if (topSellerSnapshot?.menu_items) {
    const menuItemNames = topSellerSnapshot.menu_items as { name_en?: string, name_ja?: string, name_vi?: string };
    topSellerNameToday = menuItemNames[`name_${locale}` as keyof typeof menuItemNames] || menuItemNames.name_en || "Top Item";
  } else if (topSellerSnapshot?.top_seller_item_id) {
    topSellerNameToday = `Item ID: ${topSellerSnapshot.top_seller_item_id}`;
  }


  const LOW_STOCK_THRESHOLD = 10;
  const { count: lowStockCount, error: lowStockError } = await supabase
    .from("inventory_items")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .lt("stock_level", LOW_STOCK_THRESHOLD);
  if (lowStockError) console.error("Error fetching low stock count:", lowStockError.message);

  // --- Data for Sales Report Tab (Default: Last 7 Days) ---
  const { data: dailySales7DaysData, error: dailySalesError } = await supabase
    .from("analytics_snapshots")
    .select("date, total_sales")
    .eq("restaurant_id", restaurantId)
    .gte("date", dateFrom7Days)
    .lte("date", today)
    .order("date", { ascending: true });
  if (dailySalesError) console.error("Error fetching daily sales for 7 days:", dailySalesError.message);

  const { data: categorySales7DaysData, error: rpcError } = await supabase
    .rpc("get_category_sales", {
      p_restaurant_id: restaurantId,
      p_range_type: 'last7days'
    });
  if (rpcError) console.error("Error calling get_category_sales RPC for 7 days:", rpcError.message);

  // --- Data for Items Report Tab ---
  const { data: itemsReportData, error: itemsRpcError } = await supabase
    .rpc("get_items_report", {
      p_restaurant_id: restaurantId
    });
  if (itemsRpcError) console.error("Error calling get_items_report RPC:", itemsRpcError.message);

  const reportPageData: ReportPageData = {
    totalSalesToday: totalSalesToday,
    activeOrdersCount: activeOrdersCount ?? 0,
    topSellerNameToday: topSellerNameToday,
    lowStockCount: lowStockCount ?? 0,
    dailySales7Days: (dailySales7DaysData as DailySale[] || []),
    categorySales7Days: (categorySales7DaysData as CategorySale[] || []),
    itemsReportData: (itemsReportData as ItemsReportDataItem[] || []),
  };

  return (
    <ReportPageClient
      initialReportData={reportPageData}
      restaurantId={restaurantId} // Pass restaurantId if needed by client for further calls
      locale={locale}
    />
  );
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading reports data...</div>}>
        <ReportsLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
