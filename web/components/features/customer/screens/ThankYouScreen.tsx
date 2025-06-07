// web/components/features/customer/screens/ThankYouScreen.tsx
"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RestaurantSettings } from "@/shared/types/customer";

interface ThankYouScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: any;
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
  const orderId = viewProps?.orderId;
  const items = viewProps?.items || [];
  const total = viewProps?.total || 0;
  const tableNumber = viewProps?.tableNumber;

  // Helper function to get item name (now items should have string names)
  const getItemName = (item: any) => {
    // If item.name is already a string, use it directly
    if (typeof item.name === 'string') return item.name;
    
    // If item.itemName is a string, use it
    if (typeof item.itemName === 'string') return item.itemName;
    
    // Fallback for old format with localized names
    if (item.name_en) return item.name_en;
    if (item.name_ja) return item.name_ja;
    if (item.name_vi) return item.name_vi;
    
    // Final fallback
    return "Item";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          {t("thankyou.title")}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t("thankyou.message")}
        </p>

        {orderId && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500 mb-1">
              {t("thankyou.order_id")}
            </p>
            <p className="font-mono text-lg font-semibold">
              {orderId}
            </p>
            {tableNumber && (
              <p className="text-sm text-gray-500 mt-2">
                {t("thankyou.table_number", { number: tableNumber })}
              </p>
            )}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {t("thankyou.order_summary")}
          </h3>
          <div className="space-y-2 text-left">
            {items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span>{getItemName(item)} x{item.qty || item.quantity || 1}</span>
                <span className="font-medium">
                  {t("currency_format", { value: (item.price || 0) * (item.qty || item.quantity || 1) })}
                </span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between items-center font-bold">
              <span>{t("thankyou.total")}</span>
              <span>{t("currency_format", { value: total })}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("thankyou.preparation_message")}
          </p>

          {featureFlags.advancedReviews && items.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                {t("thankyou.review_prompt")}
              </p>
              <Button
                onClick={() => setView("review", { 
                  orderId, 
                  items: items.slice(0, 1), // Start with first item
                  currentItemIndex: 0
                })}
                variant="outline"
                className="w-full"
              >
                <Star className="h-4 w-4 mr-2" />
                {t("thankyou.leave_review_button")}
              </Button>
            </div>
          )}

          <Button
            onClick={() => setView("menu")}
            style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
            className="w-full text-white hover:opacity-90"
          >
            {t("thankyou.back_to_menu")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
