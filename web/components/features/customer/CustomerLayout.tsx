// web/components/features/customer/CustomerLayout.tsx
"use client";
import React, { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MessageCircleMore, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerFooter } from "./CustomerFooter";
import { useCart } from "./CartContext";
import type { RestaurantSettings } from "@/shared/types/customer";

interface CustomerLayoutProps {
  children: ReactNode;
  setView: (v: string, props?: any) => void;
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <CustomerHeader
        restaurantSettings={restaurantSettings}
        onCartClick={() => setView("checkout")}
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
            // onClick={() => { /* TODO: Implement AI Chat toggle */ }}
          >
            <MessageCircleMore className="h-5 w-5" />
          </Button>
        )}
        <Button
          onClick={() => setView("admin")}
          variant="secondary"
          size="sm"
          className="hidden sm:flex"
        >
          <Briefcase className="h-5 w-5 mr-2" />
          {t("admin_panel_button")}
        </Button>
      </div>
    </div>
  );
}
