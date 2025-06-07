// web/components/features/customer/screens/OrderPlacedScreen.tsx
"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/features/customer/OrderSummary";
import { getCurrentLocale } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";
import type { CartItem } from "../CartContext";

interface OrderPlacedScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: {
    orderId: string;
    items: CartItem[];
    total: number;
    tableId?: string;
  };
}

export function OrderPlacedScreen({
  setView,
  restaurantSettings,
  viewProps,
}: OrderPlacedScreenProps) {
  const t = useTranslations("Customer");
  const { orderId, items, total, tableId } = viewProps;
  const locale = getCurrentLocale();

  return (
    <div className="text-center py-12">
      <CheckCircle
        className="mx-auto mb-6 text-green-500 dark:text-green-400"
        size={64}
      />
      <h2 className="text-3xl font-bold mb-3">{t("orderplaced.title")}</h2>
      <p
        className="text-lg font-semibold mb-2"
        style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
      >
        {t("thankyou.order_id_label")}: {orderId}
      </p>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        {t("orderplaced.message")}
      </p>
      <OrderSummary
        items={items}
        total={total}
        locale={locale}
        className="max-w-md mx-auto mb-8 p-4 text-left"
        restaurantSettings={restaurantSettings}
      />
      {tableId && (
        <p className="text-sm text-center mb-6">
          {t("thankyou.table_number_label")}: {tableId}
        </p>
      )}
      <div className="flex justify-center gap-4">
        <Button
          onClick={() => setView("menu", { tableId })}
          style={{ backgroundColor: restaurantSettings.secondaryColor || restaurantSettings.primaryColor }}
          className="text-white hover:opacity-90"
        >
          {t("orderplaced.add_more_button")}
        </Button>
        <Button
          onClick={() => setView("thankyou", viewProps)}
          style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
          className="text-white hover:opacity-90"
        >
          {t("orderplaced.proceed_to_checkout_button")}
        </Button>
      </div>
    </div>
  );
}
