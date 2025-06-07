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
  tables: { name: string }[] | null;
}

interface OrdersClientContentProps {
  initialOrders: Order[];
  restaurantId: string;
}

export function OrdersClientContent({
  initialOrders,
  restaurantId,
}: OrdersClientContentProps) {
  const t = useTranslations("AdminOrders");
  const tCommon = useTranslations("Common");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [viewType, setViewType] = useState<"table" | "kanban">("table");
  const [filterToday, setFilterToday] = useState(true);

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

  const statusPriority: Record<Order["status"], number> = {
    new: 1,
    preparing: 2,
    ready: 3,
    completed: 4,
    canceled: 5,
  };

  const filteredOrders = orders.filter((o) => {
    if (!filterToday) return true;
    const d = new Date(o.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const sp = statusPriority[a.status] - statusPriority[b.status];
    if (sp !== 0) return sp;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const groupItems = (items: OrderItem[]) => {
    const map: Record<string, { name: string; quantity: number }[]> = {};
    for (const item of items) {
      const cat = item.menu_items[0]?.categories?.[0];
      const catName = cat
        ? cat[`name_${locale}` as "name_en"] || cat.name_en
        : "Misc";
      if (!map[catName]) map[catName] = [];
      const itemName =
        item.menu_items[0]?.[`name_${locale}` as "name_en"] ||
        item.menu_items[0]?.name_en ||
        "";
      map[catName].push({ name: itemName, quantity: item.quantity });
    }
    return map;
  };

  const statusBadge = (status: Order["status"]) => {
    const variants: Record<
      Order["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      new: "default",
      preparing: "secondary",
      ready: "default",
      completed: "outline",
      canceled: "destructive",
    };
    return (
      <Badge variant={variants[status]} className="capitalize">
        {tCommon(`order_status.${status}`)}
      </Badge>
    );
  };

  const renderTableView = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.order")}</TableHead>
                <TableHead>{t("table.items")}</TableHead>
                <TableHead className="text-right">{t("table.total")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    {o.tables?.[0]?.name
                      ? `${t("table.table")} ${o.tables[0].name}`
                      : o.id.slice(0, 6)}
                  </TableCell>
                  <TableCell>
                    {Object.entries(groupItems(o.order_items)).map(
                      ([cat, items]) => (
                        <div key={cat} className="mb-1">
                          <span className="font-semibold mr-1">{cat}:</span>
                          {items
                            .map((it) => `${it.name} x${it.quantity}`)
                            .join(", ")}
                        </div>
                      ),
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.total_amount?.toLocaleString(locale, {
                      style: "currency",
                      currency: "JPY",
                    })}
                  </TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell>
                    {new Date(o.created_at).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderKanbanView = () => {
    const columns: Order["status"][] = ["new", "preparing", "ready"];
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <Card key={col} className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="capitalize flex items-center gap-2">
                {tCommon(`order_status.${col}`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto">
              {sortedOrders
                .filter((o) => o.status === col)
                .map((o) => (
                  <div key={o.id} className="border rounded p-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {o.tables?.[0]?.name
                          ? `${t("table.table")} ${o.tables[0].name}`
                          : o.id.slice(0, 6)}
                      </span>
                      <span>
                        {new Date(o.created_at).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {Object.entries(groupItems(o.order_items)).map(
                      ([cat, items]) => (
                        <div key={cat} className="text-xs mb-1">
                          <span className="font-semibold mr-1">{cat}:</span>
                          {items
                            .map((it) => `${it.name} x${it.quantity}`)
                            .join(", ")}
                        </div>
                      ),
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("no_orders")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={viewType === "table" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewType("table")}
        >
          {t("view_table")}
        </Button>
        <Button
          variant={viewType === "kanban" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewType("kanban")}
        >
          {t("view_kanban")}
        </Button>
        <Button
          variant={filterToday ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterToday((v) => !v)}
        >
          {t("today_only")}
        </Button>
      </div>
      {viewType === "table" ? renderTableView() : renderKanbanView()}
    </div>
  );
}
