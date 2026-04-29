"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Order } from "../types";

interface OrdersGridViewProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
  onOrderStatusUpdate?: (orderId: string, newStatus: string) => Promise<void>;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  locale?: string;
}

// Helper function to format timestamps
const formatTimestamp = (timestamp: string, locale: string = 'en') => {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orderDate = new Date(date);
  orderDate.setHours(0, 0, 0, 0);
  
  // If it's today, show only time
  if (orderDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // If it's not today, show date + time
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export function OrdersGridView({ 
  orders, 
  onOrderClick, 
  onOrderStatusUpdate,
  getStatusBadgeVariant,
  locale = 'en'
}: OrdersGridViewProps) {
  const t = useTranslations("owner.orders");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Handle order status update
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!onOrderStatusUpdate) return;
    
    setUpdatingOrderId(orderId);
    
    try {
      await onOrderStatusUpdate(orderId, newStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map(order => {
        const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
        // Estimate guest count based on item count (rough approximation)
        const estimatedGuests = Math.max(1, Math.ceil(itemCount / 3));
        const isUpdating = updatingOrderId === order.id;
        
        return (
          <Card 
            key={order.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onOrderClick(order.id)}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{order.tables?.name || 'No Table'}</h3>
                  <p className="text-sm text-gray-600">#{order.id.slice(-6)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {t(order.status)}
                  </Badge>
                  {/* Quick status update dropdown for non-completed orders */}
                  {order.status !== 'completed' && order.status !== 'canceled' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={order.status}
                        onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-24 h-6 text-xs" aria-label={t('orderStatus')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">{t('new')}</SelectItem>
                          <SelectItem value="serving">{t('serving')}</SelectItem>
                          <SelectItem value="completed">{t('completed')}</SelectItem>
                          <SelectItem value="canceled">{t('canceled')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('orderTime')}</span>
                  <span className="text-sm">{formatTimestamp(order.created_at, locale)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('totalAmount')}</span>
                  <span className="text-sm font-semibold">${(order.total_amount || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('itemCount')}</span>
                  <span className="text-sm">{itemCount} items</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('estimatedGuests')}</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="text-sm">{estimatedGuests}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrderClick(order.id);
                  }}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  {t('viewDetails')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
