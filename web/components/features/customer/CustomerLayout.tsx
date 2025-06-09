// web/components/features/customer/CustomerLayout.tsx
"use client";
import React, { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerFooter } from "./CustomerFooter";
import { useCart } from "./CartContext";
import type { RestaurantSettings } from "@/shared/types/customer";
import { ViewType, ViewProps } from "./screens/types";

interface CustomerLayoutProps {
  children: ReactNode;
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  featureFlags: {
    aiChat: boolean;
  };
}

export function CustomerLayout({
  children,
  setView,
  restaurantSettings,
  featureFlags,
}: CustomerLayoutProps) {
  const t = useTranslations("Customer");
  const { totalCartItems } = useCart();

  const handleOrderHistoryClick = () => {
    // Get table info from localStorage or URL
    const tableId =
      localStorage.getItem("tableId") ||
      new URLSearchParams(window.location.search).get("tableId");
    const tableNumber = localStorage.getItem("tableNumber");
    const sessionId = localStorage.getItem("sessionId");

    setView("thankyou", {
      tableId: tableId ?? undefined,
      tableNumber: tableNumber ?? undefined,
      sessionId: sessionId ?? undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <CustomerHeader
        restaurantSettings={restaurantSettings}
        onCartClick={() => setView("checkout")}
        onOrderHistoryClick={handleOrderHistoryClick}
        cartItemCount={totalCartItems}
      />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <CustomerFooter restaurantSettings={restaurantSettings} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {featureFlags.aiChat && (
          <Button
            variant="primary"
            size="sm"
            className="rounded-full p-3 shadow-xl"
            aria-label={t("ai_chat.toggle_label")}
            onClick={() => {
              // AI Chat functionality
              console.log("AI Chat clicked");
            }}
          >
            <MessageCircleMore className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
