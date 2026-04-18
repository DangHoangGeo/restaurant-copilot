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
import Link from "next/link";

interface CustomerHeaderProps {
  restaurantSettings: RestaurantSettings;
  onCartClick?: () => void;
  onOrderHistoryClick?: () => void;
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  cartItemCount?: number;
  showOrderHistory?: boolean;
}

export function CustomerHeader({
  restaurantSettings,
  showOrderHistory = false,
  onOrderHistoryClick,
  currentLocale,
  onLocaleChange,
}: CustomerHeaderProps) {
  const t = useTranslations("common");
  //const params = useParams();
  //const locale = (params.locale as string) || "en";
  //const router = useRouter();
  const { theme, setTheme } = useTheme();

  const is_opening = true;
  const companyName = restaurantSettings.companyName || restaurantSettings.name;
  const branchName = restaurantSettings.name;

  return (
    <header
      className="sticky z-40 w-full bg-white dark:bg-slate-900 shadow-sm"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
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
                style={{
                  backgroundColor: restaurantSettings.primaryColor || "#4f46e5",
                }}
              >
                {restaurantSettings.name?.charAt(0) || "R"}
              </div>
            )}
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">
              {companyName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {branchName && branchName !== companyName ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {branchName}
                </span>
              ) : null}
              <Clock size={12} className="mr-1" />
              <span>{is_opening ? " Open Now" : "Closed"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <LanguageSwitcher
            currentLocale={currentLocale}
            onLocaleChange={onLocaleChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
            aria-label={
              theme === "dark"
                ? t("switch_to_light_mode")
                : t("switch_to_dark_mode")
            }
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
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">
                {t("order_history_label")}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
