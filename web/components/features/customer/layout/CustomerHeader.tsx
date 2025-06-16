"use client";
import React from "react";
//import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTheme } from "next-themes";
import type { RestaurantSettings } from "@/shared/types/customer";
import Image from "next/image";

interface CustomerHeaderProps {
  restaurantSettings: RestaurantSettings;
  onCartClick?: () => void;
  onOrderHistoryClick?: () => void;
  cartItemCount?: number;
  showOrderHistory?: boolean;
}

export function CustomerHeader({
  restaurantSettings,
  showOrderHistory = false,
  onOrderHistoryClick,
}: CustomerHeaderProps) {
  const t = useTranslations("Common");
  //const params = useParams();
  //const locale = (params.locale as string) || "en";
  //const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {restaurantSettings.logoUrl ? (
            <div className="h-10 w-10 relative overflow-hidden rounded-md">
              <Image
                src={restaurantSettings.logoUrl}
                alt={restaurantSettings.name || "Restaurant logo"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div 
              className="h-10 w-10 rounded-md flex items-center justify-center text-white text-lg font-bold"
              style={{backgroundColor: restaurantSettings.primaryColor || "#4f46e5"}}
            >
              {restaurantSettings.name?.charAt(0) || "R"}
            </div>
          )}
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">
              {restaurantSettings.name}
            </h1>
            <div className="flex items-center text-xs text-slate-500">
              <Clock size={12} className="mr-1" />
              <span>
                Open Daily • 9:00 AM - 10:00 PM
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <LanguageSwitcher 
            currentLocale="en" 
            onLocaleChange={() => {}} 
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
            aria-label={theme === "dark" ? t("switch_to_light_mode") : t("switch_to_dark_mode")}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-slate-400" />
            ) : (
              <Moon size={18} className="text-slate-600" />
            )}
          </Button>
          
          {showOrderHistory && (
            <Button 
              variant="ghost" 
              className="text-slate-600 dark:text-slate-300" 
              onClick={onOrderHistoryClick}
            >
              {t("order_history")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
