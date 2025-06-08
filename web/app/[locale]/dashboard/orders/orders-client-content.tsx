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
import {
  Eye,
  Plus,
  ChefHat,
  Clock,
  ShoppingCart,
  Check,
  Search,
  CreditCard,
  Edit3,
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
    price?: number;
    categories?: {
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    };
  };
}

interface Order {
  id: string;
  table_id: string;
  status: "new" | "preparing" | "ready" | "completed" | "canceled";
  total_amount: number | null;
  created_at: string;
  order_items: OrderItem[];
  tables: { name: string; id?: string } | null;
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
  
  // Note editing for existing items
  const [editingNotes, setEditingNotes] = useState<{[key: string]: boolean}>({});
  const [tempNotes, setTempNotes] = useState<{[key: string]: string}>({});
  
  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  // Order details modal
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

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

  // Simplified interface for flattened order items
  interface FlatOrderItem {
    id: string;
    quantity: number;
    notes?: string | null;
    status: "ordered" | "preparing" | "ready" | "served";
    created_at: string;
    // Flattened menu item data
    menu_item_id: string;
    menu_item_name_en: string;
    menu_item_name_ja: string;
    menu_item_name_vi: string;
    menu_item_price?: number;
    // Flattened order/table data
    order_id: string;
    table_name: string;
  }

  // Get all order items for the items view - simplified version
  const getAllOrderItems = (): FlatOrderItem[] => {
    const allItems: FlatOrderItem[] = [];
    orders.forEach(order => {
      const tableName = order.tables?.name || `Order ${order.id.slice(0, 6)}`;
      
      order.order_items.forEach(item => {
        const menuItem = item.menu_items;
        if (menuItem) {
          allItems.push({
            id: item.id,
            quantity: item.quantity,
            notes: item.notes,
            status: item.status,
            created_at: item.created_at,
            // Flatten menu item data
            menu_item_id: menuItem.id,
            menu_item_name_en: menuItem.name_en,
            menu_item_name_ja: menuItem.name_ja,
            menu_item_name_vi: menuItem.name_vi,
            menu_item_price: menuItem.price,
            // Flatten order/table data
            order_id: order.id,
            table_name: tableName,
          });
        }
      });
    });
    
    return allItems
      .filter(item => {
        const matchesSearch = searchTerm === "" || 
          item.menu_item_name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.menu_item_name_ja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.table_name.toLowerCase().includes(searchTerm.toLowerCase());
        
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
        order.tables?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const updateItemNotes = async (itemId: string, notes: string | null) => {
    try {
      const response = await fetch(`/api/v1/order-items/${itemId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) throw new Error("Failed to update item notes");
      
      toast.success(t("notes_updated"));
      
      // Optimistically update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => ({
          ...order,
          order_items: order.order_items.map(item =>
            item.id === itemId ? { ...item, notes } : item
          )
        }))
      );
    } catch (error) {
      console.error("Error updating item notes:", error);
      toast.error(t("error_updating_notes"));
    }
  };

  const createNewOrder = async () => {
    if (!selectedTable || Object.keys(currentOrderItems).length === 0) {
      toast.error(t("select_table_and_items"));
      return;
    }

    try {
      const orderItems = Object.entries(currentOrderItems)
        //.filter(([unused, quantity]) => quantity > 0)
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
        //.filter(([unused, quantity]) => quantity > 0)
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

  const startEditingNotes = (itemId: string, currentNotes: string | null) => {
    setEditingNotes(prev => ({ ...prev, [itemId]: true }));
    setTempNotes(prev => ({ ...prev, [itemId]: currentNotes || "" }));
  };

  const saveNotes = (itemId: string) => {
    const notes = tempNotes[itemId]?.trim() || null;
    updateItemNotes(itemId, notes);
    setEditingNotes(prev => ({ ...prev, [itemId]: false }));
    setTempNotes(prev => ({ ...prev, [itemId]: "" }));
  };

  const cancelEditingNotes = (itemId: string) => {
    setEditingNotes(prev => ({ ...prev, [itemId]: false }));
    setTempNotes(prev => ({ ...prev, [itemId]: "" }));
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
        {tCommon(`order_item_status.${status}`) || tCommon(`order_item_status.${status}`)}
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
                      {item.table_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getLocalizedText({
                            "name_en": item.menu_item_name_en,
                            "name_vi": item.menu_item_name_vi,
                            "name_ja": item.menu_item_name_ja
                          }, locale)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.menu_item_price ? `¥${item.menu_item_price.toLocaleString()}` : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editingNotes[item.id] ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={tempNotes[item.id] || ""}
                              onChange={(e) => setTempNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder={t("add_notes")}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveNotes(item.id);
                                } else if (e.key === "Escape") {
                                  cancelEditingNotes(item.id);
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveNotes(item.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelEditingNotes(item.id)}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600 flex-1">
                              {item.notes || "-"}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingNotes(item.id, item.notes? item.notes : "")}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
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
                            <ChefHat className="h-3 w-3 mr-1" /> {tCommon("order_item_status.preparing")}
                          </Button>
                        )}
                        {item.status === "preparing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemStatus(item.id, "ready")}
                          >
                            <Clock className="h-3 w-3 mr-1" /> {tCommon("order_item_status.ready")}
                          </Button>
                        )}
                        {item.status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemStatus(item.id, "served")}
                          >
                            <Check className="h-3 w-3 mr-1" /> {tCommon("order_item_status.served")}
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
                      {order.tables?.name || `Order ${order.id.slice(0, 6)}`}
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
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderDetailsModalOpen(true);
                          }}
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

  const useRenderMenuSelection = () => {
    const [searchTerm, setSearchTerm] = useState("");
    interface SelectedMenuItem {
      item: {
        id: string;
        name_en: string;
        name_ja: string;
        name_vi: string;
        price: number;
        available: boolean;
      };
      quantity: number;
      editingNotes?: boolean;
    }

    const [selectedItems, setSelectedItems] = useState<{[key: string]: SelectedMenuItem}>({});

    // Flatten all menu items for searching
    const allMenuItems = menuCategories.flatMap(category => 
      category.menu_items
        .filter(item => item.available)
        .map(item => ({
          ...item,
          categoryName: getLocalizedText({
            "name_en": category.name_en,
            "name_vi": category.name_vi, 
            "name_ja": category.name_ja
          }, locale)
        }))
    );

    // Filter items based on search
    const filteredItems = allMenuItems.filter(item => {
      const itemName = getLocalizedText({
        "name_en": item.name_en,
        "name_vi": item.name_vi,
        "name_ja": item.name_ja
      }, locale).toLowerCase();
      
      const search = searchTerm.toLowerCase();
      return itemName.includes(search) || 
             item.id.toLowerCase().includes(search) ||
             item.categoryName.toLowerCase().includes(search);
    });

    return (
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("search_items")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Selected Items Summary */}
        {Object.keys(selectedItems).length > 0 && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">{t("selected_items")}</h4>
            <div className="space-y-2">
              {Object.entries(selectedItems).map(([itemId, {item, quantity}]) => (
                <div key={itemId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getLocalizedText({
                          "name_en": item.name_en,
                          "name_vi": item.name_vi,
                          "name_ja": item.name_ja
                        }, locale)}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        ¥{item.price.toLocaleString()} × {quantity}
                      </span>
                    </div>
                    {selectedItems[itemId].editingNotes && (
                      <div className="mt-2 w-full">
                        <Input
                          placeholder={t("add_notes")}
                          value={orderNotes[itemId] || ""}
                          onChange={(e) => setOrderNotes(prev => ({...prev, [itemId]: e.target.value}))}
                          className="w-full"
                          onBlur={() => {
                            // Save notes on blur
                            const newItems = {...selectedItems};
                            newItems[itemId] = {...newItems[itemId], editingNotes: false};
                            setSelectedItems(newItems);
                          }}
                        />
                      </div>
                    )}
                    {orderNotes[itemId] && !selectedItems[itemId].editingNotes&& (
                      <div className="mt-2 w-full">
                        <span className="text-sm text-gray-600">
                          {orderNotes[itemId]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newItems = {...selectedItems};
                        if (quantity > 1) {
                          newItems[itemId] = {...newItems[itemId], quantity: quantity - 1};
                        } else {
                          delete newItems[itemId];
                        }
                        setSelectedItems(newItems);
                        
                        // Update parent state
                        const newOrderItems = {...currentOrderItems};
                        if (quantity > 1) {
                          newOrderItems[itemId] = quantity - 1;
                        } else {
                          delete newOrderItems[itemId];
                        }
                        setCurrentOrderItems(newOrderItems);
                      }}
                    >
                      -
                    </Button>
                    <span className="w-4 text-center">{quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newItems = {...selectedItems};
                        newItems[itemId] = {...newItems[itemId], quantity: quantity + 1};
                        setSelectedItems(newItems);
                        
                        // Update parent state
                        setCurrentOrderItems(prev => ({
                          ...prev,
                          [itemId]: quantity + 1
                        }));
                      }}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const newItems = {...selectedItems};
                        delete newItems[itemId];
                        setSelectedItems(newItems);
                        
                        // Update parent state
                        const newOrderItems = {...currentOrderItems};
                        delete newOrderItems[itemId];
                        setCurrentOrderItems(newOrderItems);
                      }}
                    >
                      ×
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Enable editing notes
                        const newItems = {...selectedItems};
                        newItems[itemId] = {...newItems[itemId], editingNotes: true};
                        setSelectedItems(newItems);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Search Results */}
        <div className="space-y-2">
          {searchTerm && (
            <p className="text-sm text-gray-600">
              {filteredItems.length} items found
            </p>
          )}
          
          {(searchTerm ? filteredItems : allMenuItems.slice(0, 10)).map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {getLocalizedText({
                        "name_en": item.name_en,
                        "name_vi": item.name_vi,
                        "name_ja": item.name_ja
                      }, locale)}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {item.categoryName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm font-medium text-green-600">
                      ¥{item.price.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {tCommon("available")}
                    </Badge>
                  </div>
                </div>
               
                <Button
                  size="sm"
                  onClick={() => {
                    const newItems = {...selectedItems};
                    if (newItems[item.id]) {
                      newItems[item.id].quantity += 1;
                    } else {
                      newItems[item.id] = {item, quantity: 1};
                    }
                    setSelectedItems(newItems);
                    
                    // Update parent state
                    setCurrentOrderItems(prev => ({
                      ...prev,
                      [item.id]: (prev[item.id] || 0) + 1
                    }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                </Button>
              </div>
            </Card>
          ))}
          
          {!searchTerm && allMenuItems.length > 10 && (
            <p className="text-sm text-gray-500 text-center">
              Type to search through all {allMenuItems.length} items...
            </p>
          )}
        </div>
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
                {useRenderMenuSelection()}
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
              {t("add_items_to_order")} - {selectedOrder?.tables?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[400px]">
              {useRenderMenuSelection()}
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
                  <p><strong>{t("table")}:</strong> {selectedOrder.tables?.name}</p>
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

      {/* Order Details Modal */}
      <Dialog open={isOrderDetailsModalOpen} onOpenChange={setIsOrderDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("order_details")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder && (
              <>
                <div>
                  <p><strong>{t("table")}:</strong> {selectedOrder.tables?.name}</p>
                  <p><strong>{t("total")}:</strong> ¥{selectedOrder.total_amount?.toLocaleString()}</p>
                  <p><strong>{t("status")}:</strong> {tCommon(`order_status.${selectedOrder.status}`)}</p>
                </div>
                <div className="text-sm text-gray-600">
                  {t("order_items")}:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {selectedOrder.order_items.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>
                        {getLocalizedText({
                          "name_en": item.menu_items.name_en,
                          "name_vi": item.menu_items.name_vi,
                          "name_ja": item.menu_items.name_ja
                        }, locale)} ({item.quantity})
                      </span>
                      <span>¥{(item.menu_items.price! * item.quantity).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailsModalOpen(false)}>
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
