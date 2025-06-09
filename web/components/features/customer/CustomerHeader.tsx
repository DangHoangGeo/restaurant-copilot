// web/components/features/customer/CustomerHeader.tsx
"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import type { RestaurantSettings } from "@/shared/types/customer";

interface CustomerHeaderProps {
  restaurantSettings: RestaurantSettings;
  onCartClick: () => void;
  onOrderHistoryClick: () => void;
  cartItemCount: number;
  showOrderHistory?: boolean;
}

export function CustomerHeader({
  restaurantSettings,
  showOrderHistory = false,
  onOrderHistoryClick,
}: CustomerHeaderProps) {
  const t = useTranslations("Common");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const router = useRouter();

  const handleLocaleChange = (newLocale: string) => {
    router.push(`/${newLocale}/customer`);
  };

  return (
    <header
      className="sticky top-0 z-30 shadow-lg"
      style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          {restaurantSettings.logoUrl && (
            <img
              src={restaurantSettings.logoUrl}
              alt={`${restaurantSettings.name} logo`}
              className="h-10 w-10 rounded-full mr-3 object-cover bg-white p-0.5"
            />
          )}
          <h1 className="text-xl font-bold text-white">
            {restaurantSettings.name}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <LanguageSwitcher
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
          />
          {showOrderHistory && (
            <Button
              variant="ghost"
              onClick={onOrderHistoryClick}
              className="text-white hover:bg-white/20"
              aria-label={t("order_history_label")}
              size="sm"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t("order_history_label")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
