// web/components/features/customer/screens/ThankYouScreen.tsx
"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Star, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/features/customer/OrderSummary";
import { useGetCurrentLocale } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";
import { ViewProps, ViewType, ThankYouScreenViewProps, MenuViewProps, ReviewViewProps } from "./types";

interface ThankYouScreenProps {
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: ThankYouScreenViewProps;
}

export function ThankYouScreen({
  setView,
  restaurantSettings,
  viewProps,
}: ThankYouScreenProps) {
  const t = useTranslations("Customer");
  const tCommon = useTranslations("Common");
  const { orderId, items, total, tableId, tableNumber } = viewProps;
  const locale = useGetCurrentLocale();

  const canShowReviewButton = true;

  return (
    <div className="text-center py-12">
      <CheckCircle
        className="mx-auto mb-6 text-green-500 dark:text-green-400"
        size={64}
      />
      <h2 className="text-3xl font-bold mb-3">{t("thankyou.title")}</h2>
      <p
        className="text-lg font-semibold mb-2"
        style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
      >
        {t("thankyou.order_id_label")}: {orderId}
      </p>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        {t("thankyou.message")}
      </p>
      <OrderSummary
        items={items.map(item => ({ ...item, quantity: item.qty }))}
        total={total}
        locale={locale}
        className="max-w-md mx-auto mb-8 p-4 text-left"
        restaurantSettings={restaurantSettings}
      />
      {tableNumber && (
        <p className="text-sm text-center mb-6">
          {t("thankyou.table_number_label")}: {tableNumber}
        </p>
      )}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button
          onClick={() => setView("menu", { tableId, tableNumber, canAddItems: true } as MenuViewProps)}
          style={{ backgroundColor: restaurantSettings.secondaryColor || restaurantSettings.primaryColor }}
          className="text-white hover:opacity-90"
        >
          {tCommon("add_more_items")}
        </Button>
        {canShowReviewButton && (
          <Button
            onClick={() => setView("review", { orderId, items, canAddItems: false } as ReviewViewProps)}
            variant="outline"
            style={{ borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor }}
            className="hover:opacity-90"
          >
            <Star className="h-4 w-4 mr-1" />
            {t("thankyou.review_button")}
          </Button>
        )}
        <Button
          onClick={() => setView("orderhistory", { tableId, tableNumber, canAddItems: false } as MenuViewProps)}
          variant="outline"
          className="hover:opacity-90"
        >
          <History className="h-4 w-4 mr-1" />
          {t("thankyou.order_history_button")}
        </Button>
      </div>
      <div className="mt-8">
        <Button
          onClick={() => setView("menu", { tableId, tableNumber, canAddItems: true } as MenuViewProps)}
          variant="link"
          className="text-sm"
        >
          {tCommon("back_to_menu")}
        </Button>
      </div>
    </div>
  );
}
