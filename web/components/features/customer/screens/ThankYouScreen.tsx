// web/components/features/customer/screens/ThankYouScreen.tsx
"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, ChevronRight, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/features/customer/OrderSummary";
import { getCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";
import type { CartItem } from "../CartContext";

interface ThankYouScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: {
    orderId: string;
    items: CartItem[];
    total: number;
    tableId?: string;
  };
  featureFlags: {
    advancedReviews: boolean;
  };
}

export function ThankYouScreen({
  setView,
  restaurantSettings,
  viewProps,
  featureFlags,
}: ThankYouScreenProps) {
  const t = useTranslations("Customer");
  const { orderId, items, total, tableId } = viewProps;
  const locale = getCurrentLocale();

  return (
    <div className="text-center py-12">
      <CheckCircle
        className="mx-auto mb-6 text-green-500 dark:text-green-400"
        size={64}
      />
      <h2 className="text-3xl font-bold mb-3">{t("thankyou.title")}</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-2">
        {t("thankyou.subtitle")}
      </p>
      <p
        className="text-lg font-semibold mb-6"
        style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
      >
        {t("thankyou.order_id_label")}: {orderId}
      </p>
      <OrderSummary
        items={items}
        total={total}
        locale={locale}
        showImages={false}
        isAdjustable={false}
        className="max-w-md mx-auto mb-8 p-4 text-left"
      />
      {tableId && (
        <p className="text-sm text-center mb-6">
          {t("thankyou.table_number_label")}: {tableId}
        </p>
      )}
      {featureFlags.advancedReviews && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">
            {t("thankyou.rate_dishes_title")}
          </h3>
          <div className="space-y-3 max-w-md mx-auto">
            {items.slice(0, 3).map((item: CartItem) => (
              <Button
                key={item.itemId}
                variant="secondary"
                className="w-full justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                onClick={() =>
                  setView("review", {
                    menuItemId: item.itemId,
                    menuItemName: getLocalizedText(item.name, locale),
                    orderId: orderId, 
                  })
                }
              >
                {t("thankyou.rate_this_dish_button", {
                  dish: getLocalizedText(item.name, locale),
                })}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}
      <Button
        onClick={() => setView("menu", { tableId })}
        size="lg"
        className="mt-10 text-white hover:opacity-90"
        style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
      >
        <MenuIcon className="h-4 w-4 mr-1" />
        {t("thankyou.back_to_menu_button")}
      </Button>
    </div>
  );
}
