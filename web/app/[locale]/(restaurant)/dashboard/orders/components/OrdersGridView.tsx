"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Order } from "../types";

interface OrdersGridViewProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
}

export function OrdersGridView({ 
  orders, 
  onOrderClick, 
  getStatusBadgeVariant 
}: OrdersGridViewProps) {
  const t = useTranslations("owner.orders");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map(order => {
        const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
        // Estimate guest count based on item count (rough approximation)
        const estimatedGuests = Math.max(1, Math.ceil(itemCount / 3));
        
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
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {t(order.status)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('orderTime')}</span>
                  <span className="text-sm">{new Date(order.created_at).toLocaleTimeString()}</span>
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
