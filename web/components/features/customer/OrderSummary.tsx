"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";

interface OrderSummaryProps {
  items: Array<{
    itemId: string;
    name: string;
    qty: number;
    price: number;
    quantity?: number;
    itemName?: string;
  }>;
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
      {items.map((item, index) => (
        <div key={`${item.itemId}-${index}`} className="flex justify-between items-start py-2 border-b last:border-b-0 dark:border-slate-700">
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {getLocalizedText(item.name, locale)||item.itemName || item.name}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("checkout.quantity")}: {item.qty || item.quantity || 1}
            </p>
          </div>
          <div className="text-right ml-4">
            <p className="font-medium">
              {t("currency_format", { value: (item.price * (item.qty || item.quantity || 1)) })}
            </p>
          </div>
        </div>
      ))}
      
      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">{t("checkout.total")}</span>
          <span 
            className="text-xl font-bold"
            style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
          >
            {t("currency_format", { value: total })}
          </span>
        </div>
      </div>
    </Card>
  );
}
