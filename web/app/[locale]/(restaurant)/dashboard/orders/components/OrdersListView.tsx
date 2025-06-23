"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Order } from "../types";
import { OrderItemCard } from "./OrderItemCard";

interface OrdersListViewProps {
  orders: Order[];
  onItemStatusUpdate: (itemId: string, newStatus: string) => Promise<void>;
  getItemStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  locale: string;
}

export function OrdersListView({ 
  orders, 
  onItemStatusUpdate, 
  getItemStatusBadgeVariant,
  locale 
}: OrdersListViewProps) {
  const t = useTranslations("owner.orders");

  // Flatten all order items with their order context
  const orderItemsWithContext = orders.flatMap(order =>
    order.order_items.map(item => ({
      ...item,
      orderInfo: {
        tableName: order.tables?.name || 'No Table',
        orderTime: order.created_at,
        orderId: order.id
      }
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t('orderItems')} ({orderItemsWithContext.length})
        </h2>
      </div>

      {orderItemsWithContext.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">{t('noOrderItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderItemsWithContext.map((item) => (
            <div key={`${item.orderInfo.orderId}-${item.id}`}>
              {/* Order Context Header */}
              <div className="mb-2 p-2 bg-gray-50 rounded-t-lg">
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span className="font-medium">{item.orderInfo.tableName}</span>
                  <span>{new Date(item.orderInfo.orderTime).toLocaleTimeString(locale)}</span>
                </div>
              </div>
              
              {/* Order Item Card */}
              <OrderItemCard
                item={item}
                locale={locale}
                onStatusUpdate={onItemStatusUpdate}
                getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                showActions={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
