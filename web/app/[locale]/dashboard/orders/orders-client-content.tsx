"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Eye,
  Plus,
  ChefHat,
  Clock,
  DollarSign,
  Users,
  ShoppingCart,
  Check,
  X,
  Filter,
  Search,
  RefreshCw,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedText } from "@/lib/customerUtils";

interface OrderItem {
  id: string;
  quantity: number;
  notes?: string | null;
  status: "ordered" | "preparing" | "ready" | "served";
  created_at: string;
  menu_items: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    category_id: string;
    price: number;
    categories?: {
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    }[];
  }[];
}

interface Order {
  id: string;
  table_id: string;
  status: "new" | "preparing" | "ready" | "completed" | "canceled";
  total_amount: number | null;
  created_at: string;
  order_items: OrderItem[];
  tables: { name: string; id: string }[] | null;
}

interface Table {
  id: string;
  name: string;
  status?: "available" | "occupied" | "reserved";
}

interface Category {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
    available: boolean;
  }[];
}

interface OrdersClientContentProps {
  initialOrders: Order[];
  availableTables: Table[];
  menuCategories: Category[];
  restaurantId: string;
}

export function OrdersClientContent({
  initialOrders,
  availableTables,
  menuCategories,
  restaurantId,
}: OrdersClientContentProps) {
  const t = useTranslations("AdminOrders");
  const tCommon = useTranslations("Common");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [viewType, setViewType] = useState<"items" | "orders">("items");
  const [filterToday, setFilterToday] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // New order management
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<{[key: string]: number}>({});
  const [orderNotes, setOrderNotes] = useState<{[key: string]: string}>({});
  
  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function fetchOrders() {
      try {
        const res = await fetch(`/api/v1/orders/list?today=${filterToday}`);
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        }
      } catch (e) {
        console.error("Failed to fetch orders", e);
      }
    }

    fetchOrders();

    const channel = supabase
      .channel("orders-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchOrders(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, filterToday]);

  const statusPriority: Record<OrderItem["status"], number> = {
    ordered: 1,
    preparing: 2,
    ready: 3,
    served: 4,
  };

  const orderStatusPriority: Record<Order["status"], number> = {
    new: 1,
    preparing: 2,
    ready: 3,
    completed: 4,
    canceled: 5,
  };

  // Get all order items for the items view
  const getAllOrderItems = () => {
    const allItems: (OrderItem & { order: Order })[] = [];
    orders.forEach(order => {
      order.order_items.forEach(item => {
        allItems.push({ ...item, order });
      });
    });
    
    return allItems
      .filter(item => {
        const matchesSearch = searchTerm === "" || 
          item.menu_items[0]?.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.menu_items[0]?.name_ja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.order.tables?.[0]?.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === "all" || item.status === filterStatus;
        
        if (!filterToday) return matchesSearch && matchesStatus;
        
        const itemDate = new Date(item.created_at);
        const today = new Date();
        const isToday = itemDate.toDateString() === today.toDateString();
        
        return matchesSearch && matchesStatus && isToday;
      })
      .sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = searchTerm === "" || 
        order.tables?.[0]?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || order.status === filterStatus;
      
      if (!filterToday) return matchesSearch && matchesStatus;
      
      const orderDate = new Date(order.created_at);
      const today = new Date();
      const isToday = orderDate.toDateString() === today.toDateString();
      
      return matchesSearch && matchesStatus && isToday;
    })
    .sort((a, b) => {
      const statusDiff = orderStatusPriority[a.status] - orderStatusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const updateItemStatus = async (itemId: string, newStatus: OrderItem["status"]) => {
    try {
      const response = await fetch(`/api/v1/order-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update item status");
      
      toast.success(t("item_status_updated"));
      
      // Optimistically update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => ({
          ...order,
          order_items: order.order_items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          )
        }))
      );
    } catch (error) {
      console.error("Error updating item status:", error);
      toast.error(t("error_updating_status"));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const response = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update order status");
      
      toast.success(t("order_status_updated"));
      
      // Optimistically update the local state
      setOrders(prevOrders => 
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(t("error_updating_status"));
    }
  };

  const createNewOrder = async () => {
    if (!selectedTable || Object.keys(currentOrderItems).length === 0) {
      toast.error(t("select_table_and_items"));
      return;
    }

    try {
      const orderItems = Object.entries(currentOrderItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([menuItemId, quantity]) => ({
          menu_item_id: menuItemId,
          quantity,
          notes: orderNotes[menuItemId] || null,
        }));

      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: selectedTable,
          order_items: orderItems,
        }),
      });

      if (!response.ok) throw new Error("Failed to create order");
      
      toast.success(t("order_created"));
      setIsNewOrderModalOpen(false);
      setSelectedTable("");
      setCurrentOrderItems({});
      setOrderNotes({});
      
      // Refresh orders
      const res = await fetch(`/api/v1/orders/list?today=${filterToday}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(t("error_creating_order"));
    }
  };

  const addItemsToOrder = async () => {
    if (!selectedOrder || Object.keys(currentOrderItems).length === 0) {
      toast.error(t("select_items"));
      return;
    }

    try {
      const orderItems = Object.entries(currentOrderItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([menuItemId, quantity]) => ({
          menu_item_id: menuItemId,
          quantity,
          notes: orderNotes[menuItemId] || null,
        }));

      const response = await fetch(`/api/v1/orders/${selectedOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_items: orderItems }),
      });

      if (!response.ok) throw new Error("Failed to add items to order");
      
      toast.success(t("items_added"));
      setIsAddItemsModalOpen(false);
      setSelectedOrder(null);
      setCurrentOrderItems({});
      setOrderNotes({});
      
      // Refresh orders
      const res = await fetch(`/api/v1/orders/list?today=${filterToday}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error adding items to order:", error);
      toast.error(t("error_adding_items"));
    }
  };

  const processCheckout = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/v1/orders/${selectedOrder.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to process checkout");
      
      toast.success(t("checkout_processed"));
      setIsCheckoutModalOpen(false);
      setSelectedOrder(null);
      
      // Refresh orders
      const res = await fetch(`/api/v1/orders/list?today=${filterToday}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error processing checkout:", error);
      toast.error(t("error_processing_checkout"));
    }
  };

  const getStatusBadge = (status: OrderItem["status"] | Order["status"]) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ordered: "default",
      new: "default",
      preparing: "secondary",
      ready: "outline",
      served: "outline",
      completed: "outline",
      canceled: "destructive",
    };
    
    return (
      <Badge variant={variants[status]} className="capitalize">
        {tCommon(`order_status.${status}`) || tCommon(`order_item_status.${status}`)}
      </Badge>
    );
  };


  const renderItemsView = () => {
    const allItems = getAllOrderItems();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {t("order_items")} ({allItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table")}</TableHead>
                  <TableHead>{t("item")}</TableHead>
                  <TableHead className="text-center">{t("quantity")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-center">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.order.tables?.[0]?.name || `Order ${item.order.id.slice(0, 6)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getLocalizedText(item.menu_items[0], locale)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ¥{item.menu_items[0]?.price?.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {item.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.status === "ordered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemStatus(item.id, "preparing")}
                          >
                            <ChefHat className="h-3 w-3" />
                          </Button>
                        )}
                        {item.status === "preparing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemStatus(item.id, "ready")}
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                        )}
                        {item.status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemStatus(item.id, "served")}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  const renderOrdersView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("orders")} ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table")}</TableHead>
                  <TableHead>{t("items_count")}</TableHead>
                  <TableHead className="text-right">{t("total")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead className="text-center">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.tables?.[0]?.name || `Order ${order.id.slice(0, 6)}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.order_items.length} {t("items")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{order.total_amount?.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsAddItemsModalOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        {order.status !== "completed" && order.status !== "canceled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsCheckoutModalOpen(true);
                            }}
                          >
                            <CreditCard className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  const renderMenuSelection = () => {
    return (
      <div className="space-y-4">
        {menuCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{getLocalizedText(category,locale)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {category.menu_items.filter(item => item.available).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{getLocalizedText(item,locale)}</span>
                      <span className="text-xs text-gray-500 block">¥{item.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentOrderItems(prev => ({
                            ...prev,
                            [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                          }));
                        }}
                      >
                        -
                      </Button>
                      <span className="text-sm w-8 text-center">
                        {currentOrderItems[item.id] || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentOrderItems(prev => ({
                            ...prev,
                            [item.id]: (prev[item.id] || 0) + 1
                          }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === "items" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("items")}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            {t("items_view")}
          </Button>
          <Button
            variant={viewType === "orders" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("orders")}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t("orders_view")}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filter_by_status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_statuses")}</SelectItem>
              <SelectItem value="ordered">{t("ordered")}</SelectItem>
              <SelectItem value="preparing">{t("preparing")}</SelectItem>
              <SelectItem value="ready">{t("ready")}</SelectItem>
              <SelectItem value="served">{t("served")}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={filterToday ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterToday(!filterToday)}
          >
            {t("today_only")}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("new_order")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {viewType === "items" ? renderItemsView() : renderOrdersView()}

      {/* New Order Modal */}
      <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("create_new_order")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("select_table")}</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder={t("choose_table")} />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">{t("select_menu_items")}</label>
              <ScrollArea className="h-[400px] mt-2">
                {renderMenuSelection()}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={createNewOrder}>
              {t("create_order")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Items Modal */}
      <Dialog open={isAddItemsModalOpen} onOpenChange={setIsAddItemsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("add_items_to_order")} - {selectedOrder?.tables?.[0]?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[400px]">
              {renderMenuSelection()}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemsModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={addItemsToOrder}>
              {t("add_items")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("process_checkout")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder && (
              <>
                <div>
                  <p><strong>{t("table")}:</strong> {selectedOrder.tables?.[0]?.name}</p>
                  <p><strong>{t("total")}:</strong> ¥{selectedOrder.total_amount?.toLocaleString()}</p>
                  <p><strong>{t("items")}:</strong> {selectedOrder.order_items.length}</p>
                </div>
                <div className="text-sm text-gray-600">
                  {t("checkout_confirmation")}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={processCheckout} className="bg-green-600 hover:bg-green-700">
              {t("process_payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
