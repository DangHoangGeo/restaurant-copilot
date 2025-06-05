**Step 6: Implement Admin Dashboard Landing Page**

**Goal:** Create the main dashboard page that displays summary statistics (StatCards) and quick actions.

**Files to Create/Modify:**

*   `/web/app/[locale]/dashboard/page.tsx` (Server Component for data fetching)
*   `/web/app/[locale]/dashboard/dashboard-client-content.tsx` (Client Component for rendering and minor client-side logic if any)
*   `/web/components/features/admin/dashboard/StatCard.tsx` (Reusable component for statistics)
*   `/web/components/features/admin/dashboard/QuickActions.tsx` (Component for quick action buttons)
*   `/web/components/features/admin/dashboard/RecentOrdersTable.tsx` (Placeholder for now)

**Key Logic/Data Requirements for `page.tsx`:**
*   Fetch data for "Today's Total Sales", "Active Orders Count", "Top-Selling Item Today", "Low-Stock Alerts" using `supabaseAdmin` as per `04_admin-dashboard.md`.
*   This data will be passed as props to the client component.

**Mockup Code to Adapt:** `DashboardScreen` and its `StatCard` sub-component.

**Adaptation Instructions for Copilot:**

**1. Create `StatCard.tsx` Component**

```tsx
// Copilot, create this file: /web/components/features/admin/dashboard/StatCard.tsx
'use client'; // If it has client-side interactions or uses hooks like useTranslations directly

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface StatCardProps {
  titleKey: string; // i18n key
  value: string | number;
  icon: LucideIcon;
  trend?: string; // i18n key for trend, or pre-formatted string
  trendDirection?: 'up' | 'down' | 'neutral';
  colorClass?: string; // e.g., 'text-blue-600 dark:text-blue-400'
  bgColorClass?: string; // e.g., 'bg-blue-100 dark:bg-blue-900/30'
  isAlert?: boolean;
  isLoading?: boolean;
}

export function StatCard({
  titleKey,
  value,
  icon: IconComponent,
  trend,
  trendDirection = 'neutral',
  colorClass = 'text-primary',
  bgColorClass = 'bg-primary/10',
  isAlert = false,
  isLoading = false,
}: StatCardProps) {
  const t = useTranslations('AdminDashboard.cards'); // Specific namespace for card titles
  const tCommon = useTranslations('Common');

  if (isLoading) {
    return (
      <Card className={cn(isAlert && 'border-2 border-destructive dark:border-destructive')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t(titleKey)}</CardTitle>
          <div className={cn("p-2 rounded-md", bgColorClass)}>
            <IconComponent className={cn("h-5 w-5 animate-pulse", colorClass)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold animate-pulse bg-muted h-9 w-24 rounded-md"></div>
          {trend && <div className="text-xs text-muted-foreground mt-2 animate-pulse bg-muted h-4 w-32 rounded-md"></div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(isAlert && 'border-2 border-destructive dark:border-destructive')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t(titleKey)}</CardTitle>
        <div className={cn("p-2 rounded-md", bgColorClass)}>
          <IconComponent className={cn("h-5 w-5", colorClass)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {trend && (
          <p
            className={cn(
              "text-xs text-muted-foreground mt-2",
              trendDirection === 'up' && 'text-green-600 dark:text-green-400',
              trendDirection === 'down' && 'text-red-600 dark:text-red-400'
            )}
          >
            {/* Assuming trend is a pre-formatted string or an i18n key */}
            {trend.startsWith('+') || trend.startsWith('-') ? trend : tCommon(trend as any)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**2. Create `QuickActions.tsx` Component**

```tsx
// Copilot, create this file: /web/components/features/admin/dashboard/QuickActions.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, QrCode, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export function QuickActions() {
  const t = useTranslations('AdminDashboard');
  const params = useParams();
  const locale = params.locale as string || 'en';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('quick_actions.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="default" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/menu?action=addItem`}> {/* Query param to trigger modal or go to new item page */}
            <PlusCircle className="mr-2 h-4 w-4" /> {t('quick_actions.add_menu_item')}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/tables?action=generateQr`}>
            <QrCode className="mr-2 h-4 w-4" /> {t('quick_actions.generate_qr')}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/employees?action=addEmployee`}>
            <UserPlus className="mr-2 h-4 w-4" /> {t('quick_actions.add_employee')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

**3. Create `RecentOrdersTable.tsx` (Placeholder)**

```tsx
// Copilot, create this file: /web/components/features/admin/dashboard/RecentOrdersTable.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define a type for your order data structure
export interface RecentOrder {
  id: string;
  customerName?: string; // Or table name
  itemsCount: number;
  totalAmount: number;
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'canceled';
  createdAt: Date;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

export function RecentOrdersTable({ orders, isLoading = false }: RecentOrdersTableProps) {
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');

  const getStatusBadgeVariant = (status: RecentOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'new': return 'default'; // Or 'outline' with primary color
      case 'preparing': return 'secondary';
      case 'ready': return 'default'; // Greenish, shadcn default can be customized
      case 'completed': return 'outline';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('recent_orders.no_recent_orders')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full"> {/* Adjust height as needed */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('recent_orders.table_header_order')}</TableHead>
                <TableHead>{t('recent_orders.table_header_items')}</TableHead>
                <TableHead className="text-right">{t('recent_orders.table_header_total')}</TableHead>
                <TableHead>{t('recent_orders.table_header_status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customerName || `Order #${order.id.substring(0, 6)}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(useParams().locale as string || 'en', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt))}
                    </div>
                  </TableCell>
                  <TableCell>{order.itemsCount}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat(useParams().locale as string || 'en', { style: 'currency', currency: 'JPY' }).format(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                      {tCommon(`order_status.${order.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

**4. Create `dashboard-client-content.tsx`**

```tsx
// Copilot, create this file: /web/app/[locale]/dashboard/dashboard-client-content.tsx
'use client';

import { StatCard } from '@/components/features/admin/dashboard/StatCard';
import { QuickActions } from '@/components/features/admin/dashboard/QuickActions';
import { RecentOrdersTable, RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, FileText, BarChart2 } from 'lucide-react'; // Import necessary icons
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { Card, CardContent } from '@/components/ui/card';
import { ComingSoon } from '@/components/common/coming-soon'; // Assuming you have this or similar
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils'; // You'll need a currency formatting util

// Define a type for the initial data passed from the server component
export interface DashboardData {
  todaySales: number;
  activeOrdersCount: number;
  topSellerToday: { name: string; metricValue: string | number; } | null; // metricValue could be sales count or rating
  lowStockItemsCount: number;
}

interface DashboardClientContentProps {
  initialData: DashboardData | null; // Can be null if data fetching fails
  recentOrders: RecentOrder[]; // Or null
  isLoading: boolean; // Passed from server component if initial fetch is loading
  error?: string | null; // Error message from server
}

export function DashboardClientContent({ initialData, recentOrders, isLoading, error }: DashboardClientContentProps) {
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');

  // Use FEATURE_FLAGS directly
  const lowStockAlertsEnabled = FEATURE_FLAGS.lowStockAlerts;

  if (error) {
    return <div className="text-destructive p-4 border border-destructive bg-destructive/10 rounded-md">{error}</div>;
  }

  const topSellerName = initialData?.topSellerToday?.name ?? t('cards.top_seller_unavailable');
  const topSellerMetric = initialData?.topSellerToday?.metricValue ?? '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titleKey="cards.todays_sales"
          value={initialData ? formatCurrency(initialData.todaySales, 'JPY') : 'N/A'}
          icon={DollarSign}
          // trend="+5.2% vs yesterday" // Example, fetch or calculate if needed
          // trendDirection="up"
          colorClass="text-blue-600 dark:text-blue-400"
          bgColorClass="bg-blue-100 dark:bg-blue-900/30"
          isLoading={isLoading}
        />
        <StatCard
          titleKey="cards.active_orders"
          value={initialData ? initialData.activeOrdersCount : 'N/A'}
          icon={ShoppingCart}
          // trend="-2 vs last hour"
          // trendDirection="down"
          colorClass="text-indigo-600 dark:text-indigo-400"
          bgColorClass="bg-indigo-100 dark:bg-indigo-900/30"
          isLoading={isLoading}
        />
        <StatCard
          titleKey="cards.top_seller_today" // Changed key to be more generic for today
          value={isLoading ? tCommon('loading') : topSellerName}
          icon={TrendingUp}
          trend={isLoading ? '' : String(topSellerMetric)} // Display metric like sales count or rating
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgColorClass="bg-emerald-100 dark:bg-emerald-900/30"
          isLoading={isLoading}
        />
        {lowStockAlertsEnabled ? (
          <StatCard
            titleKey="cards.low_stock_alerts"
            value={initialData ? initialData.lowStockItemsCount : 'N/A'}
            icon={AlertTriangle}
            trend={initialData && initialData.lowStockItemsCount > 0 ? t('cards.needs_attention') : t('cards.all_good')}
            colorClass="text-amber-600 dark:text-amber-400"
            bgColorClass="bg-amber-100 dark:bg-amber-900/30"
            isAlert={initialData ? initialData.lowStockItemsCount > 0 : false}
            isLoading={isLoading}
          />
        ) : (
          <Card className="flex items-center justify-center">
            <CardContent className="p-6">
              <ComingSoon featureName="feature.low_stock_alerts_dashboard" />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentOrdersTable orders={recentOrders || []} isLoading={isLoading} />
        <QuickActions />
      </div>
      
      {/* Placeholder for more charts/reports */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <BarChart2 className="mx-auto h-12 w-12 mb-2" />
            {t('charts.sales_over_time_placeholder')}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-2" />
             {t('charts.popular_items_report_placeholder')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**5. Update `page.tsx` Server Component**

```tsx
// Copilot, modify this file: /web/app/[locale]/dashboard/page.tsx
import { DashboardClientContent, DashboardData } from './dashboard-client-content';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'; // Your server Supabase client
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings'; // Assuming this exists
import { headers } from 'next/headers';
import { RecentOrder } from '@/components/features/admin/dashboard/RecentOrdersTable'; // Import the type
import { FEATURE_FLAGS } from '@/config/feature-flags';

// Helper to get subdomain, this should be robust
function getSubdomainFromHost(host: string): string | null {
  const parts = host.split('.');
  const rootDomainParts = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'shop-copilot.com').split('.').length;
  if (parts.length > rootDomainParts) {
      return parts[0];
  }
  return null;
}


export default async function DashboardPage({ params: { locale } }: { params: { locale: string }}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations({locale, namespace: 'AdminDashboard'});
  const supabase = createClient();

  let restaurantId: string | null = null;
  const host = headers().get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  if (subdomain) {
    restaurantId = await getRestaurantIdFromSubdomain(subdomain); // Implement this function
  }

  if (!restaurantId) {
    // Handle case where restaurantId couldn't be determined
    // This might involve redirecting or showing an error specific to multi-tenancy setup
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

    // 2. Active Orders Count
    const { count: activeOrdersCount, error: activeOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("completed", "canceled")'); // Active = not completed or canceled
    
    if (activeOrdersError) throw activeOrdersError;

    // 3. Top-Selling Item Today
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
    if (topSellerRaw && topSellerRaw.length > 0) {
        // Simplified aggregation: count occurrences of menu items
        const itemCounts: Record<string, { nameObj: any; count: number }> = {};
        topSellerRaw.forEach(item => {
            if (item.menu_items) {
                const id = item.menu_items.id;
                if (!itemCounts[id]) {
                    itemCounts[id] = { nameObj: {en: item.menu_items.name_en, ja: item.menu_items.name_ja, vi: item.menu_items.name_vi}, count: 0 };
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


    // 4. Low-Stock Alerts
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
    
    dashboardData = {
      todaySales: todaySales,
      activeOrdersCount: activeOrdersCount || 0,
      topSellerToday: topSellerTodayData,
      lowStockItemsCount: lowStockItemsCount,
    };

    // Fetch Recent Orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_id, total_amount, status, created_at, tables (name)') // Join with tables to get table name
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5); // Get last 5 orders

    if (ordersError) throw ordersError;
    recentOrdersData = orders?.map(o => ({
      id: o.id,
      // @ts-ignore
      customerName: o.tables?.name ? `${t('recent_orders.table_prefix')} ${o.tables.name}` : `Order ${o.id.substring(0,6)}`, // Use table name or fallback
      itemsCount: 0, // This would require joining order_items and counting, or a subquery. Placeholder for now.
      totalAmount: o.total_amount || 0,
      status: o.status as RecentOrder['status'],
      createdAt: new Date(o.created_at),
    })) || [];
    
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


  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    fetchError = error.message || t('errors.data_fetch_error');
    // Set dashboardData to some defaults or empty state if partial data is not useful
    dashboardData = {
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
```
*Create/Update `getRestaurantIdFromSubdomain` helper (example):*
```typescript
// Copilot, create/update this file: /lib/server/restaurant-settings.ts
// ... (keep existing getRestaurantSettingsFromSubdomain)

import { createClient as createSupabaseServerClient } from '@/utils/supabase/server'; // Ensure correct path

export async function getRestaurantIdFromSubdomain(subdomain: string): Promise<string | null> {
  if (!subdomain) return null;
  
  const supabase = createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      console.error(`Error fetching restaurant ID for subdomain ${subdomain}:`, error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error(`Exception fetching restaurant ID for subdomain ${subdomain}:`, e);
    return null;
  }
}
```
*Create a currency formatting utility:*
```typescript
// Copilot, create this file: /lib/utils.ts (or add to existing)
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'JPY', // Default currency
  locale: string = 'ja-JP' // Default locale for Japanese Yen
): string {
  if (amount === null || amount === undefined) {
    return 'N/A'; // Or some other placeholder
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      // minimumFractionDigits: 0, // Optional: for currencies like JPY that don't use decimals
      // maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("Currency formatting error:", error);
    return `${currency} ${amount.toFixed(2)}`; // Fallback
  }
}
```

**Add i18n keys to your JSON files (e.g., `en.json`):**
```json
// Example for /web/i18n/locales/en.json
{
  "Common": {
    "loading": "Loading...",
    "sold_units": "sold",
    "order_status": {
      "new": "New",
      "preparing": "Preparing",
      "ready": "Ready",
      "completed": "Completed",
      "canceled": "Canceled"
    }
    // ... other common keys
  },
  "AdminDashboard": {
    "title": "Dashboard",
    "cards": {
      "todays_sales": "Today's Sales",
      "active_orders": "Active Orders",
      "top_seller_today": "Top Seller Today",
      "top_seller_unavailable": "N/A",
      "low_stock_alerts": "Low Stock Alerts",
      "needs_attention": "Needs Attention",
      "all_good": "All Good",
      "sold_units": "sold"
    },
    "quick_actions": {
      "title": "Quick Actions",
      "add_menu_item": "Add New Menu Item",
      "generate_qr": "Generate Table QR Code",
      "add_employee": "Add New Employee"
    },
    "recent_orders": {
      "title": "Recent Orders",
      "no_recent_orders": "No recent orders to display.",
      "table_header_order": "Order / Table",
      "table_header_items": "Items",
      "table_header_total": "Total",
      "table_header_status": "Status",
      "table_prefix": "Table"
    },
    "charts": {
        "sales_over_time_placeholder": "Sales Over Time Chart - Coming Soon",
        "popular_items_report_placeholder": "Popular Items Report - Coming Soon"
    },
    "errors": {
      "restaurant_not_found": "Restaurant context could not be determined. Please ensure you are accessing via a valid restaurant subdomain.",
      "data_fetch_error": "Failed to load dashboard data. Please try again later."
    },
    "feature": {
        "low_stock_alerts_dashboard": "Low Stock Alerts on Dashboard"
    }
  },
  "AdminNav": { // For sidebar and header titles
    "admin_sidebar_dashboard": "Dashboard",
    "admin_sidebar_restaurant_settings": "Restaurant Settings",
    "admin_sidebar_menu_management": "Menu Management",
    // ... other nav keys
    "admin_dashboard_title": "Dashboard" // Default if no match
  }
  // ... other namespaces
}
```

**Verification Points:**
*   Dashboard page renders within the admin layout.
*   StatCards display data fetched from Supabase (or mock data if Supabase queries are placeholders).
*   `isLoading` state correctly shows skeletons/placeholders while data is fetched.
*   Quick Actions buttons link to the intended (future) pages/modals.
*   Recent Orders table shows a placeholder or actual recent orders.
*   Low Stock Alerts card respects the `FEATURE_FLAGS.lowStockAlerts` setting.
*   All text is internationalized.

---

This sets up the main Dashboard page. We can then move to the "Restaurant Settings" page or another as per your priority. Remember to implement the actual Supabase queries in `page.tsx` according to `04_admin-dashboard.md`. The "Top-Selling Item Today" and "Recent Orders items count" queries are more complex and might require database functions (RPCs) or more elaborate joins for efficiency in a real application. For now, the placeholders will get the UI structure in place.