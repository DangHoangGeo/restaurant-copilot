"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { 
  useRestaurantData, 
  useMutation, 
  usePerformanceMonitor 
} from "@/hooks";
import { OrdersSkeleton } from "@/components/ui/skeletons";
import { ErrorState } from "@/components/ui/states";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type DateRange } from "@/components/features/admin/reports/date-range-selector";
import { Order, Table as TableType } from "./types";
import { Category } from '@/shared/types/menu';

// Import modular components
import { OrdersStatsHeader } from "./components/OrdersStatsHeader";
import { OrdersFilters } from "./components/OrdersFilters";
import { ViewToggle } from "./components/ViewToggle";
import { OrdersGridView } from "./components/OrdersGridView";
import { OrdersListView } from "./components/OrdersListView";
import { OrdersTableView } from "./components/OrdersTableView";
import { OrderDetailModal } from "./components/OrderDetailModal";
import { NewOrderModal } from "./components/NewOrderModal";

interface OrdersData {
  orders: Order[];
  tables: TableType[];
  categories: Category[];
}

export function OrdersClientContent() {
  const t = useTranslations("owner.orders");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { logInteraction } = usePerformanceMonitor('OrdersPage');

  // State management
  const [viewType, setViewType] = useState<"items" | "orders" | "grid">("grid");
  const [itemStatus, setItemStatus] = useState<string>("all");
  const [orderStatus, setOrderStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(), // Default to yesterday
    to: new Date(), // Default to today
  });

  // Build dynamic endpoint with query parameters
  const buildEndpoint = () => {
    const params = new URLSearchParams();
    params.append('period', 'today'); // Default period
    if (orderStatus !== 'all') {
      params.append('status', orderStatus);
    } else {
      params.append('status', 'new , serving , completed ,canceled');
    }
    params.append('fromDate', dateRange.from.toISOString().split('T')[0]);
    params.append('toDate', dateRange.to.toISOString().split('T')[0]);
    
    return `/owner/orders?${params.toString()}`;
  };

  // Fetch orders data
  const {
    data: ordersData,
    isInitialLoading,
    error,
    refetch
  } = useRestaurantData<OrdersData>(buildEndpoint(), {
    autoRefresh: 10000, // Auto refresh every 10 seconds for real-time updates
    dependencies: [orderStatus, dateRange] // Refetch when these change
  });
  
  // Modal states
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  
  // Form states for new order
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [currentOrderItems, setCurrentOrderItems] = useState<{[key: string]: number}>({});
  const [orderNotes, setOrderNotes] = useState<{[key: string]: string}>({});
  
  // Create order mutation
  const createOrder = useMutation<unknown, unknown>({
    endpoint: '/api/v1/owner/orders',
    method: 'POST',
    onSuccess: () => {
      logInteraction('order_created');
      toast.success(t('orderCreated'));
      setIsNewOrderModalOpen(false);
      setCurrentOrderItems({});
      setOrderNotes({});
      setSelectedTable("");
      refetch();
    },
    onError: () => {
      toast.error(t('orderCreationFailed'));
    },
  });

  // Item status update handler
  const handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    logInteraction('item_status_update_initiated');
    
    try {
      const response = await fetch(`/api/v1/owner/orders/order-items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update item status');
      
      logInteraction('item_status_updated');
      toast.success(t('itemStatusUpdated'));
      refetch();
    } catch {
      toast.error(t('itemStatusUpdateFailed'));
    }
  };

  // Create order handler
  const handleCreateOrder = async () => {
    if (!selectedTable || Object.keys(currentOrderItems).length === 0) {
      toast.error(t('pleaseSelectTableAndItems'));
      return;
    }

    const orderItems = Object.entries(currentOrderItems)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => ({
        menu_item_id: menuItemId,
        quantity,
        notes: orderNotes[menuItemId] || null,
      }));

    await createOrder.mutate({
      table_id: selectedTable,
      order_items: orderItems,
    });
  };

  // Badge variant helpers
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "serving": return "secondary";
      case "completed": return "default";
      case "canceled": return "destructive";
      default: return "default";
    }
  };

  const getItemStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ordered": return "default";
      case "preparing": return "secondary";
      case "ready": return "outline";
      case "served": return "default";
      default: return "default";
    }
  };

  // Show loading skeleton
  if (isInitialLoading) {
    return <OrdersSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={refetch}
        title={t('loadingError')}
      />
    );
  }

  // Always get the data, but show empty state for orders if needed
  const { orders = [], tables = [], categories = [] } = ordersData || {};

  // Filter logic - separating order status from item status
  const filteredOrders = orders.filter(order => {
    // Search by table name or last 6 characters of order ID
    const orderIdLast6 = order.id.slice(-6).toLowerCase();
    const tableName = order.tables?.name || '';
    const matchesSearch = searchTerm === "" || 
      tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderIdLast6.includes(searchTerm.toLowerCase());
    
    // Filter by ORDER status for order views, ITEM status for item view
    const matchesStatus = viewType === "items" 
      ? (itemStatus === "all" || order.order_items.some(item => item.status === itemStatus))
      : (orderStatus === "all" || order.status === orderStatus);
    
    // Date range filtering
    const orderDate = new Date(order.created_at);
    const matchesDateRange = orderDate >= dateRange.from && orderDate <= dateRange.to;
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Calculate statistics
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = filteredOrders.reduce((sum, order) => 
    sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  return (
    <PageTemplate
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Button 
          onClick={() => {
            logInteraction('new_order_clicked');
            setIsNewOrderModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('newOrder')}
        </Button>
      }
    >
      {/* Stats Header */}
      <OrdersStatsHeader
        totalOrders={totalOrders}
        totalRevenue={totalRevenue}
        avgOrderValue={avgOrderValue}
        totalItems={totalItems}
      />

      {/* Filters */}
      <OrdersFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        itemStatus={itemStatus}
        onItemStatusChange={setItemStatus}
        orderStatus={orderStatus}
        onOrderStatusChange={setOrderStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        viewType={viewType}
      />

      {/* View Toggle */}
      <ViewToggle
        viewType={viewType}
        onViewTypeChange={setViewType}
      />

      {/* Content Area - Show empty state if no orders */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {orders.length === 0 ? t('no_orders') : t('empty_state.title')}
          </h3>
          <p className="text-gray-500 mb-6">
            {orders.length === 0 ? t('createFirstOrder') : t('empty_state.description')}
          </p>
          {orders.length === 0 && (
            <Button 
              onClick={() => {
                logInteraction('create_first_order_from_empty_state');
                setIsNewOrderModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('createFirstOrder')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewType === "grid" && (
            <OrdersGridView
              orders={filteredOrders}
              onOrderClick={(orderId) => {
                const order = filteredOrders.find(o => o.id === orderId);
                if (order) setSelectedOrderForDetail(order);
              }}
              getStatusBadgeVariant={getStatusBadgeVariant}
            />
          )}

          {viewType === "items" && (
            <OrdersListView
              orders={filteredOrders}
              onItemStatusUpdate={handleItemStatusUpdate}
              getItemStatusBadgeVariant={getItemStatusBadgeVariant}
              locale={locale}
            />
          )}

          {viewType === "orders" && (
            <OrdersTableView
              orders={filteredOrders}
              onOrderClick={(orderId) => {
                const order = filteredOrders.find(o => o.id === orderId);
                if (order) setSelectedOrderForDetail(order);
              }}
              getStatusBadgeVariant={getStatusBadgeVariant}
              locale={locale}
            />
          )}
        </>
      )}

      {/* Modals */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        tables={tables}
        categories={categories}
        selectedTable={selectedTable}
        onTableChange={setSelectedTable}
        currentOrderItems={currentOrderItems}
        onOrderItemsChange={setCurrentOrderItems}
        orderNotes={orderNotes}
        onOrderNotesChange={setOrderNotes}
        onCreateOrder={handleCreateOrder}
        isCreating={createOrder.isLoading}
        locale={locale}
      />

      <OrderDetailModal
        order={selectedOrderForDetail}
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        locale={locale}
      />
    </PageTemplate>
  );
}
