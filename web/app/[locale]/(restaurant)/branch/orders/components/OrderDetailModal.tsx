"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Order } from "../types";
import { Category } from '@/shared/types/menu';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  locale: string;
  categories?: Category[];
  onAddItems?: (orderId: string, items: Array<{
    menu_item_id: string;
    quantity: number;
    notes?: string;
    menu_item_size_id?: string;
    topping_ids?: string[];
  }>) => Promise<void>;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => Promise<void>;
}

export function OrderDetailModal({ 
  isOpen, 
  onClose, 
  order,
  locale,
  categories = [], // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddItems,
  onUpdateOrderStatus
}: OrderDetailModalProps) {
  const t = useTranslations("owner.orders");
  const [showAddItems, setShowAddItems] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!order) return null;

  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedGuests = Math.max(1, Math.ceil(itemCount / 3));

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onUpdateOrderStatus) return;
    
    setUpdatingStatus(true);
    try {
      await onUpdateOrderStatus(order.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle>
              {t('order_details.title')} - {order.tables?.name} (#{order.id.slice(-6)})
            </DialogTitle>
            <div className="flex gap-2">
              {/* Status Update */}
              {order.status !== 'completed' && order.status !== 'canceled' && onUpdateOrderStatus && (
                <Select
                  value={order.status}
                  onValueChange={handleStatusUpdate}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t('new')}</SelectItem>
                    <SelectItem value="preparing">{t('preparing')}</SelectItem>
                    <SelectItem value="ready">{t('ready')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="canceled">{t('canceled')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Add Items Button */}
              {order.status !== 'completed' && order.status !== 'canceled' && onAddItems && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItems(!showAddItems)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addItems')}
                </Button>
              )}
              
              {/* Checkout Button */}
              {(order.status === 'ready' || order.status === 'preparing') && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={updatingStatus}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {t('checkout')}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('order_details.order_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orderTime')}</span>
                  <span>{new Date(order.created_at).toLocaleString(locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('order_details.table_number')}</span>
                  <span>{order.tables?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('estimatedGuests')}</span>
                  <span>{estimatedGuests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orderStatus')}</span>
                  <Badge>{t(order.status)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('totalAmount')}</span>
                  <span className="font-semibold">${(order.total_amount || 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('orderItems')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.order_items.map((item) => {
                    const menuItem = item.menu_items;
                    return (
                      <div key={item.id} className="flex justify-between items-start p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">
                            {locale === 'en' ? menuItem?.name_en :
                             locale === 'ja' ? menuItem?.name_ja :
                             locale === 'vi' ? menuItem?.name_vi :
                             menuItem?.name_en || 'Unknown item'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {t('quantity')}: {item.quantity}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-600 mt-1">
                              {t('notes')}: {item.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{t(item.status)}</Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            ${((item?.price_at_order ?? 0) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
