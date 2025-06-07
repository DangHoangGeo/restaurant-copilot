// web/components/features/customer/screens/ThankYouScreen.tsx
"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Plus, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderSummary } from "@/components/features/customer/OrderSummary";
import { getCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";

interface ThankYouScreenProps {
  setView: (view: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: {
    orderId: string;
    items: Array<{
      itemId: string;
      name: string;
      qty: number;
      price: number;
      quantity?: number;
      itemName?: string;
    }>;
    total: number;
    tableId?: string;
    tableNumber?: string;
  };
}

export function ThankYouScreen({
  setView,
  restaurantSettings,
  viewProps,
}: ThankYouScreenProps) {
  const t = useTranslations("Customer");
  const { orderId, items, total, tableNumber } = viewProps;
  const locale = getCurrentLocale();
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const handleAddMoreItems = () => {
    setView("menu", viewProps);
  };

  const handleViewOrderHistory = () => {
    setView("orderhistory", {
      tableId: viewProps.tableId,
      sessionId: orderId, // Use orderId as sessionId for current session
      tableNumber
    });
  };

  const handleLeaveReview = (itemId: string) => {
    setView("review", {
      orderId,
      items,
      currentItemIndex: items.findIndex(item => item.itemId === itemId),
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Success Message */}
      <div className="text-center py-8">
        <CheckCircle
          className="mx-auto mb-6 text-green-500 dark:text-green-400"
          size={64}
        />
        <h2 className="text-3xl font-bold mb-3">{t("thankyou.title")}</h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-2">
          {t("thankyou.subtitle")}
        </p>
        <p
          className="text-lg font-semibold mb-4"
          style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
        >
          {t("thankyou.order_id_label")}: #{orderId.slice(-6)}
        </p>
        {tableNumber && (
          <p className="text-md text-slate-600 dark:text-slate-300">
            {t("thankyou.table_number", { number: tableNumber })}
          </p>
        )}
      </div>

      {/* Order Summary */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">{t("thankyou.order_summary_title")}</h3>
        <OrderSummary
          items={items}
          total={total}
          restaurantSettings={restaurantSettings}
          locale={locale}
        />
      </Card>

      {/* Next Steps */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t("thankyou.preparation_message")}</h3>
        <div className="space-y-3">
          <Button
            onClick={handleAddMoreItems}
            variant="outline"
            className="w-full justify-center"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t("orderplaced.add_more_button")}
          </Button>
          
          <Button
            onClick={handleViewOrderHistory}
            variant="outline"
            className="w-full justify-center"
            size="lg"
          >
            <Clock className="h-5 w-5 mr-2" />
            {t("thankyou.view_order_history")}
          </Button>
        </div>
      </Card>

      {/* Review Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t("thankyou.rate_dishes_title")}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          {t("thankyou.review_prompt")}
        </p>
        <div className="space-y-2">
          {items.map((item) => (
            <Button
              key={item.itemId}
              onClick={() => handleLeaveReview(item.itemId)}
              variant="ghost"
              className="w-full justify-between"
              size="sm"
            >
              <span>{getLocalizedText(item as any, locale)}</span>
              <Star className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </Card>

      {/* Order History Modal/Section */}
      {showOrderHistory && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("thankyou.order_history_title")}</h3>
            <Button
              onClick={() => setShowOrderHistory(false)}
              variant="ghost"
              size="sm"
            >
              ×
            </Button>
          </div>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">#{orderId.slice(-6)}</p>
                  <p className="text-sm text-slate-600">
                    {new Date().toLocaleDateString(locale, { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{t("currency_format", { value: total })}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t("thankyou.status_preparing")}
                  </span>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {items.length} {items.length === 1 ? t("thankyou.item") : t("thankyou.items")}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Back to Menu */}
      <div className="text-center pt-4">
        <Button
          onClick={() => setView("menu", viewProps)}
          variant="ghost"
          className="text-slate-600 dark:text-slate-300"
        >
          {t("thankyou.back_to_menu_button")}
        </Button>
      </div>
    </div>
  );
}
