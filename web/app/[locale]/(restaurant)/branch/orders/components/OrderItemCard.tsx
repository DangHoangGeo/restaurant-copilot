"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Clock, Check, Edit2, Trash2, X, MapPin, Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OrderItem } from "../types";

interface OrderItemCardProps {
  item: OrderItem & {
    orderInfo?: {
      tableName: string;
      orderTime: string;
      orderId: string;
    };
  };
  locale: string;
  onStatusUpdate?: (itemId: string, newStatus: string) => Promise<void>;
  onEdit?: (itemId: string, updates: Partial<OrderItem>) => Promise<void>;
  getItemStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  showActions?: boolean;
  showEditActions?: boolean;
  availableSizes?: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }>;
  availableToppings?: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }>;
}

export function OrderItemCard({
  item,
  locale,
  onStatusUpdate,
  onEdit,
  getItemStatusBadgeVariant,
  showActions = true,
  showEditActions = false,
  availableSizes = [],
  availableToppings = []
}: OrderItemCardProps) {
  const t = useTranslations("owner.orders");
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editSizeId, setEditSizeId] = useState(item.menu_item_size_id || 'none');
  const [editToppingIds, setEditToppingIds] = useState<string[]>(item.topping_ids || []);

  const handleQuickStatusChange = async () => {
    if (!onStatusUpdate) return;
    
    let nextStatus: string;
    switch (item.status) {
      case 'new':
        nextStatus = 'preparing';
        break;
      case 'preparing':
        nextStatus = 'ready';
        break;
      case 'ready':
        nextStatus = 'served';
        break;
      default:
        return;
    }
    
    await onStatusUpdate(item.id, nextStatus);
  };

  const handleCancelItem = async () => {
    if (onEdit) {
      await onEdit(item.id, { status: 'canceled' });
    }
  };

  const handleSaveEdit = async () => {
    if (onEdit) {
      await onEdit(item.id, { 
        quantity: editQuantity,
        menu_item_size_id: editSizeId === 'none' ? null : editSizeId,
        topping_ids: editToppingIds.length > 0 ? editToppingIds : null
      });
    }
    setIsEditing(false);
  };

  const handleToppingToggle = (toppingId: string) => {
    setEditToppingIds(prev => 
      prev.includes(toppingId) 
        ? prev.filter(id => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  // Get item name based on locale
  const itemName = item.menu_item ? (
    locale === 'en' ? item.menu_item.name_en :
    locale === 'ja' ? item.menu_item.name_ja :
    locale === 'vi' ? item.menu_item.name_vi :
    item.menu_item.name_en
  ) : (
    locale === 'en' ? item.menu_items?.name_en :
    locale === 'ja' ? item.menu_items?.name_ja :
    locale === 'vi' ? item.menu_items?.name_vi :
    item.menu_items?.name_en || 'Unknown Item'
  );

  // Get size name
  const sizeName = item.menu_item_sizes ? (
    locale === 'en' ? item.menu_item_sizes.name_en :
    locale === 'ja' ? item.menu_item_sizes.name_ja :
    locale === 'vi' ? item.menu_item_sizes.name_vi :
    item.menu_item_sizes.name_en
  ) : '';

  // Calculate total price
  const basePrice = item.price_at_order || item.menu_item?.price || item.menu_items?.price || 0;
  const sizePrice = item.menu_item_sizes?.price || 0;
  const toppingsPrice = item.toppings?.reduce((sum, topping) => sum + topping.price, 0) || 0;
  const totalPrice = (basePrice + sizePrice + toppingsPrice) * item.quantity;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer py-0"
      onDoubleClick={handleQuickStatusChange}
    >
      <CardContent className="p-4">
        {/* Order Info Header */}
        {item.orderInfo && (
          <div className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">{item.orderInfo.tableName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock3 className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-500">
                {new Date(item.orderInfo.orderTime).toLocaleTimeString(locale)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-tight">
              {itemName}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                × {item.quantity}
              </span>
              {sizeName && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  {sizeName}
                </span>
              )}
            </div>
          </div>
          <Badge variant={getItemStatusBadgeVariant(item.status)} className="ml-2">
            {t(item.status)}
          </Badge>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">{t('price')}</span>
          <span className="text-sm font-medium">${totalPrice.toFixed(2)}</span>
        </div>

        {/* Toppings */}
        {item.toppings && item.toppings.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">{t('toppings')}:</p>
            <div className="flex flex-wrap gap-1">
              {item.toppings.map((topping) => (
                <span
                  key={topping.id}
                  className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                >
                  {locale === 'en' ? topping.name_en :
                   locale === 'ja' ? topping.name_ja :
                   locale === 'vi' ? topping.name_vi :
                   topping.name_en}
                  {topping.price > 0 && ` (+$${topping.price.toFixed(2)})`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">{t('notes')}:</p>
            <p className="text-xs text-gray-700 bg-amber-50 border border-amber-200 p-2 rounded">
              {item.notes}
            </p>
          </div>
        )}

        {/* Action Buttons for Status Updates */}
        {showActions && onStatusUpdate && (
          <div className="flex gap-1 mt-3">
            {item.status === "new" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(item.id, "preparing")}
                className="flex-1 h-8 text-xs"
              >
                <ChefHat className="h-3 w-3 mr-1" />
                {t('markPreparing')}
              </Button>
            )}
            {item.status === "preparing" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(item.id, "ready")}
                className="flex-1 h-8 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {t('markReady')}
              </Button>
            )}
            {item.status === "ready" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(item.id, "served")}
                className="flex-1 h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                {t('markServed')}
              </Button>
            )}
          </div>
        )}

        {/* Edit Actions for New Orders */}
        {showEditActions && item.status === "new" && (
          <div className="flex gap-1 mt-3">
            {!isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 h-8 text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  {t('editItem')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelItem}
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                  aria-label={t('cancelItem')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`edit-qty-${item.id}`} className="text-xs w-12">{t('qty')}:</label>
                    <input
                      id={`edit-qty-${item.id}`}
                      type="number"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-16 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                  
                  {availableSizes && availableSizes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs">{t('size')}:</label>
                      <Select value={editSizeId} onValueChange={setEditSizeId}>
                        <SelectTrigger className="w-32 h-8 text-xs" aria-label={t('size')}>
                          <SelectValue placeholder={t('selectSize')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('noSize')}</SelectItem>
                          {availableSizes.map((size) => (
                            <SelectItem key={size.id} value={size.id}>
                              {size[`name_${locale}` as keyof typeof size] || size.name_en}
                              {size.price > 0 && ` (+$${size.price.toFixed(2)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {availableToppings && availableToppings.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs">{t('toppings')}:</label>
                      <div className="flex flex-wrap gap-1">
                        {availableToppings.map((topping) => (
                          <div key={topping.id} className="flex items-center gap-1">
                            <Checkbox
                              id={topping.id}
                              checked={editToppingIds.includes(topping.id)}
                              onCheckedChange={() => handleToppingToggle(topping.id)}
                            />
                            <label htmlFor={topping.id} className="text-xs cursor-pointer">
                              {topping[`name_${locale}` as keyof typeof topping] || topping.name_en}
                              {topping.price > 0 && (
                                <span className="text-green-600 ml-1">
                                  (+${topping.price.toFixed(2)})
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveEdit}
                    className="h-8 text-xs"
                    aria-label={t('save')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditQuantity(item.quantity);
                      setEditSizeId(item.menu_item_size_id || 'none');
                      setEditToppingIds(item.topping_ids || []);
                    }}
                    className="h-8 text-xs"
                    aria-label={t('cancel')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
