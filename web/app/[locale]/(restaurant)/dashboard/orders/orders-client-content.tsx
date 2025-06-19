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
import { ErrorState, EmptyState } from "@/components/ui/states";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageTemplate } from "@/components/ui/page-template";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category } from '@/shared/types/menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Plus,
  ChefHat,
  Clock,
  ShoppingCart,
  Check,
  Search,
} from "lucide-react";
import { Order, Table as TableType, OrderItem } from "./types";

interface OrdersData {
  orders: Order[];
  tables: TableType[];
  categories: Category[];
  restaurant: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
}

export function OrdersClientContent() {
  const t = useTranslations("owner.orders");
  const tCommon = useTranslations("common");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { logInteraction } = usePerformanceMonitor('OrdersPage');

  // Fetch all orders data with our optimized hook
  const {
    data: ordersData,
    isInitialLoading,
    error,
    refetch
  } = useRestaurantData<OrdersData>('/orders', {
    autoRefresh: 10000, // Auto refresh every 10 seconds for real-time updates
  });

  // State management
  const [viewType, setViewType] = useState<"items" | "orders">("items");
  const [filterToday, setFilterToday] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  // Form states
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [currentOrderItems, setCurrentOrderItems] = useState<{[key: string]: number}>({});
  const [orderNotes, setOrderNotes] = useState<{[key: string]: string}>({});
  
  // Only keep the create order mutation since we handle the others directly
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

  // Show empty state
  if (!ordersData?.orders?.length) {
    return (
      <PageTemplate
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button 
            onClick={() => {
              logInteraction('create_first_order_clicked');
              setIsNewOrderModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('createFirstOrder')}
          </Button>
        }
      >
        <EmptyState
          title={t('no_orders')}
          actionLabel={t('createFirstOrder')}
          onAction={() => {
            logInteraction('create_first_order_from_empty_state');
            setIsNewOrderModalOpen(true);
          }}
        />
        
        {/* Include the modal here so it's available even in empty state */}
        <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('createNewOrder')}</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Table Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('selectTable')}
                </label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('chooseTable')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ordersData?.tables?.map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Menu Items */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('selectItems')}
                </label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {ordersData?.categories?.map(category => (
                    <div key={category.id}>
                      <h4 className="font-medium text-lg mb-2">
                        {locale === 'en' ? category.name_en :
                         locale === 'ja' ? category.name_ja :
                         locale === 'vi' ? category.name_vi :
                         category.name_en || ''}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {category.menu_items?.filter(item => item.available).map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">
                                {locale === 'en' ? item.name_en :
                                 locale === 'ja' ? item.name_ja :
                                 locale === 'vi' ? item.name_vi :
                                 item.name_en || ''}
                              </div>
                              <div className="text-sm text-gray-600">
                                ${item.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const current = currentOrderItems[item.id] || 0;
                                  if (current > 0) {
                                    setCurrentOrderItems(prev => ({
                                      ...prev,
                                      [item.id]: current - 1
                                    }));
                                  }
                                }}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">
                                {currentOrderItems[item.id] || 0}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const current = currentOrderItems[item.id] || 0;
                                  setCurrentOrderItems(prev => ({
                                    ...prev,
                                    [item.id]: current + 1
                                  }));
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <LoadingButton
                onClick={handleCreateOrder}
                loading={createOrder.isLoading}
                disabled={!selectedTable || Object.keys(currentOrderItems).length === 0}
              >
                {t('createOrder')}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTemplate>
    );
  }

  const { orders, tables, categories } = ordersData;

  // Filter logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.tables[0]?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    
    const matchesToday = !filterToday || 
      new Date(order.created_at).toDateString() === new Date().toDateString();
    
    return matchesSearch && matchesStatus && matchesToday;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "preparing": return "secondary";
      case "ready": return "outline";
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder={t('searchOrders')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="new">{t('new')}</SelectItem>
            <SelectItem value="preparing">{t('preparing')}</SelectItem>
            <SelectItem value="ready">{t('ready')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
            <SelectItem value="canceled">{t('canceled')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="filterToday"
            checked={filterToday}
            onChange={(e) => setFilterToday(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="filterToday" className="text-sm font-medium">
            {t('todayOnly')}
          </label>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={viewType === "items" ? "default" : "outline"}
          onClick={() => setViewType("items")}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {t('itemView')}
        </Button>
        <Button
          variant={viewType === "orders" ? "default" : "outline"}
          onClick={() => setViewType("orders")}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t('orderView')}
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewType === "items" ? t('orderItems') : t('orders')} 
            ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table')}</TableHead>
                  <TableHead>{t('time')}</TableHead>
                  {viewType === "items" ? (
                    <>
                      <TableHead>{t('item')}</TableHead>
                      <TableHead>{t('quantity')}</TableHead>
                      <TableHead>{t('notes')}</TableHead>
                      <TableHead>{t('itemStatus')}</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>{t('items')}</TableHead>
                      <TableHead>{t('total')}</TableHead>
                      <TableHead>{t('orderStatus')}</TableHead>
                    </>
                  )}
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewType === "items" ? (
                  // Items View
                  filteredOrders.flatMap(order =>
                    order.order_items.map((item: OrderItem) => (
                      <TableRow key={`${order.id}-${item.id}`}>
                        <TableCell>{order.tables[0]?.name}</TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleTimeString(locale)}
                        </TableCell>
                        <TableCell>
                          {locale === 'en' ? item.menu_items[0]?.name_en :
                           locale === 'ja' ? item.menu_items[0]?.name_ja :
                           locale === 'vi' ? item.menu_items[0]?.name_vi :
                           item.menu_items[0]?.name_en || ''}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="max-w-32 truncate">
                          {item.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getItemStatusBadgeVariant(item.status)}>
                            {t(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {item.status === "ordered" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemStatusUpdate(item.id, "preparing")}
                              >
                                <ChefHat className="h-3 w-3" />
                              </Button>
                            )}
                            {item.status === "preparing" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemStatusUpdate(item.id, "ready")}
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                            )}
                            {item.status === "ready" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemStatusUpdate(item.id, "served")}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  // Orders View
                  filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.tables[0]?.name}</TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleTimeString(locale)}
                      </TableCell>
                      <TableCell>{order.order_items.length} items</TableCell>
                      <TableCell>
                        {order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {t(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Order Modal */}
      <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('createNewOrder')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Table Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('selectTable')}
              </label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder={t('chooseTable')} />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Menu Items */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('selectItems')}
              </label>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {categories.map(category => (
                  <div key={category.id}>
                    <h4 className="font-medium text-lg mb-2">
                      {locale === 'en' ? category.name_en :
                       locale === 'ja' ? category.name_ja :
                       locale === 'vi' ? category.name_vi :
                       category.name_en || ''}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.menu_items?.filter(item => item.available).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">
                              {locale === 'en' ? item.name_en :
                               locale === 'ja' ? item.name_ja :
                               locale === 'vi' ? item.name_vi :
                               item.name_en || ''}
                            </div>
                            <div className="text-sm text-gray-600">
                              ${item.price.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const current = currentOrderItems[item.id] || 0;
                                if (current > 0) {
                                  setCurrentOrderItems(prev => ({
                                    ...prev,
                                    [item.id]: current - 1
                                  }));
                                }
                              }}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">
                              {currentOrderItems[item.id] || 0}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const current = currentOrderItems[item.id] || 0;
                                setCurrentOrderItems(prev => ({
                                  ...prev,
                                  [item.id]: current + 1
                                }));
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <LoadingButton
              onClick={handleCreateOrder}
              loading={createOrder.isLoading}
              disabled={!selectedTable || Object.keys(currentOrderItems).length === 0}
            >
              {t('createOrder')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Other modals would go here... */}
    </PageTemplate>
  );
}
