"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { List, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MenuList } from "../MenuList";
import { SmartDiscoveryMenu } from "../SmartDiscoveryMenu";
import { useCart } from "../CartContext";
import type { ViewType, ViewProps, MenuViewProps } from "./types";
import { MenuItem } from "@/shared/types/customer";

interface Category {
  id: string;
  position: number;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: MenuItem[];
}

interface RestaurantSettings {
  primaryColor?: string;
  name?: string;
  logoUrl?: string;
}

interface CustomerMenuScreenProps {
  categories: Category[];
  setView: (view: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: MenuViewProps;
  featureFlags: {
    tableBooking: boolean;
  };
  canAddItems?: boolean;
}

export function CustomerMenuScreen({
  categories,
  setView,
  restaurantSettings,
  viewProps,
  canAddItems = true,
}: CustomerMenuScreenProps) {
  const t = useTranslations("Customer");
  const { addToCart, updateQuantity, getQuantityInCart } = useCart();
  const [useSmartDiscovery, setUseSmartDiscovery] = useState(true);

  const toggleDiscoveryMode = () => {
    setUseSmartDiscovery(!useSmartDiscovery);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Mode Toggle */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Menu</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDiscoveryMode}
            className="flex items-center space-x-2"
          >
            {useSmartDiscovery ? (
              <>
                <List className="h-4 w-4" />
                <span>Classic View</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Smart Discovery</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {useSmartDiscovery ? (
        <SmartDiscoveryMenu
          categories={categories}
          locale="en" // You may want to get this from props or context
          addToCart={addToCart}
          updateQty={updateQuantity}
          getQty={getQuantityInCart}
          brandColor={restaurantSettings.primaryColor || '#0ea5e9'}
          canAddItems={canAddItems}
          setView={setView}
          tableId={viewProps.tableId}
          sessionId={viewProps.sessionId}
          tableNumber={viewProps.tableNumber}
        />
      ) : (
        <MenuList
          categories={categories}
          searchPlaceholder={t("search_placeholder")}
          locale="en" // You may want to get this from props or context
          addToCart={addToCart}
          updateQty={updateQuantity}
          getQty={getQuantityInCart}
          brandColor={restaurantSettings.primaryColor || '#0ea5e9'}
          canAddItems={canAddItems}
          setView={setView}
          tableId={viewProps.tableId}
          sessionId={viewProps.sessionId}
          tableNumber={viewProps.tableNumber}
        />
      )}
    </div>
  );
}
