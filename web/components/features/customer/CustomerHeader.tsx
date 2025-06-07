// web/components/features/customer/CustomerHeader.tsx
"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import type { RestaurantSettings } from "@/shared/types/customer";

interface CustomerHeaderProps {
  restaurantSettings: RestaurantSettings;
  onCartClick: () => void;
  cartItemCount: number;
}

export function CustomerHeader({
  restaurantSettings,
  onCartClick,
  cartItemCount,
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
          <Button
            variant="ghost"
            onClick={onCartClick}
            className="text-white hover:bg-white/20 relative"
            aria-label={t("view_cart_label")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartItemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
