"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings, MenuItemSize, Topping } from '@/shared/types/customer';

interface OrderSummaryItem {
  uniqueId: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  qty: number;
  price: number; // This is the final price per unit for this configuration
  selectedSize?: MenuItemSize;
  selectedToppings?: Topping[];
}

interface OrderSummaryProps {
  items: OrderSummaryItem[];
  total: number;
  restaurantSettings: RestaurantSettings;
  locale: string;
  className?: string;
}

export function OrderSummary({ items, total, restaurantSettings, locale , className}: OrderSummaryProps) {
  const t = useTranslations("Customer");

  return (
    <Card className={`p-4 text-left ${className || ""}`}>
      <h3 className="text-lg font-semibold mb-3">{t("checkout.order_summary")}</h3>
      {items.map((item) => {
        const localizedItemName = getLocalizedText({ name_en: item.name_en, name_ja: item.name_ja, name_vi: item.name_vi }, locale);
        const detailsDisplay: string[] = [];
        if (item.selectedSize) {
          const localizedSizeName = getLocalizedText({ name_en: item.selectedSize.name_en, name_ja: item.selectedSize.name_ja, name_vi: item.selectedSize.name_vi }, locale);
          detailsDisplay.push(localizedSizeName);
        }
        if (item.selectedToppings && item.selectedToppings.length > 0) {
          const toppingNames = item.selectedToppings.map(t => getLocalizedText({ name_en: t.name_en, name_ja: t.name_ja, name_vi: t.name_vi }, locale)).join(", ");
          detailsDisplay.push(t('cart.toppings_label', { toppings: toppingNames }));
        }
        return (
          <div key={item.uniqueId} className="flex justify-between items-start py-2 border-b last:border-b-0 dark:border-slate-700">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100" title={localizedItemName}>
                {localizedItemName}
              </h4>
              {detailsDisplay.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" title={detailsDisplay.join(" / ")}>
                  {detailsDisplay.join(" / ")}
                </p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {t("checkout.quantity")}: {item.qty}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                ¥{((item.price * item.qty) / 100).toFixed(0)}
              </p>
            </div>
          </div>
        );
      })}
      
      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">{t("checkout.total")}</span>
          <span 
            className="text-xl font-bold"
            style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
          >
            ¥{total.toFixed(0)}
          </span>
        </div>
      </div>
    </Card>
  );
}
