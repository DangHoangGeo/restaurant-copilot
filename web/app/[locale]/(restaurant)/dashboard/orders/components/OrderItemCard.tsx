"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { OrderItem } from "../types";

interface OrderItemCardProps {
  item: OrderItem;
  locale: string;
  onStatusUpdate?: (itemId: string, newStatus: string) => Promise<void>;
  getItemStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  showActions?: boolean;
}

export function OrderItemCard({
  item,
  locale,
  onStatusUpdate,
  getItemStatusBadgeVariant,
  showActions = true
}: OrderItemCardProps) {
  const t = useTranslations("owner.orders");

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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {itemName} × {item.quantity}
            </h4>
            {sizeName && (
              <p className="text-xs text-gray-500 mt-1">{sizeName}</p>
            )}
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
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">{t('toppings')}:</p>
            <div className="flex flex-wrap gap-1">
              {item.toppings.slice(0, 3).map((topping) => (
                <span
                  key={topping.id}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  {locale === 'en' ? topping.name_en :
                   locale === 'ja' ? topping.name_ja :
                   locale === 'vi' ? topping.name_vi :
                   topping.name_en}
                </span>
              ))}
              {item.toppings.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.toppings.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">{t('notes')}:</p>
            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
              {item.notes}
            </p>
          </div>
        )}

        {/* Action Buttons for Status Updates */}
        {showActions && onStatusUpdate && (
          <div className="flex gap-1 mt-3">
            {item.status === "ordered" && (
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
      </CardContent>
    </Card>
  );
}
