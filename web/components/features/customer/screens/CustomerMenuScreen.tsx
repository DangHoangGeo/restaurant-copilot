"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { List, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MenuList } from "../MenuList";
import { SmartDiscoveryMenu } from "../SmartDiscoveryMenu";
import { useCart } from "../CartContext";
import type { ViewType, ViewProps, MenuViewProps } from "./types";
import { MenuItem, Category } from "@/shared/types/menu";
import { ContextualGreeting, generateContextualInfo } from "@/components/common/ContextualGreeting";
import { RestaurantSettings } from "@/shared/types";


interface CustomerMenuScreenProps {
  categories: Category[];
  setView: (view: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: MenuViewProps;
  featureFlags: {
    tableBooking: boolean;
  };
  canAddItems?: boolean;
  locale?: string; // Optional locale prop for flexibility
}

export function CustomerMenuScreen({
  categories,
  setView,
  restaurantSettings,
  viewProps,
  canAddItems = true,
  locale = "en", // Default to English if not provided
}: CustomerMenuScreenProps) {
  const t = useTranslations("Customer");
  const { addToCart: addToCartAdvanced, updateQuantity, getQuantityByItemId, cart } = useCart();
  const [useSmartDiscovery, setUseSmartDiscovery] = useState(false);

  const toggleDiscoveryMode = () => {
    setUseSmartDiscovery(!useSmartDiscovery);
  };

  // Contextual information using the reusable helper
  const contextualInfo = useMemo(() => {
    return generateContextualInfo(restaurantSettings?.name, locale);
  }, [restaurantSettings?.name, locale]);

  // Simple cart interface wrappers for menu components
  const addToCartSimple = (item: MenuItem) => {
    // For simple add to cart (no sizes/toppings), use default parameters
    addToCartAdvanced(item, 1, undefined, undefined);
  };

  const getQtySimple = (itemId: string) => {
    // Use the helper method from CartContext
    return getQuantityByItemId(itemId);
  };

  const updateQtySimple = (itemId: string, newQty: number) => {
    // Find all cart items for this itemId
    const itemVariations = cart.filter(cartItem => cartItem.itemId === itemId);
    
    if (itemVariations.length === 0) {
      // No variations exist, this shouldn't happen in normal flow
      return;
    }

    if (newQty <= 0) {
      // Remove all variations of this item
      itemVariations.forEach(variation => {
        updateQuantity(variation.uniqueId, 0);
      });
      return;
    }

    if (itemVariations.length === 1) {
      // Only one variation exists, update it directly
      updateQuantity(itemVariations[0].uniqueId, newQty);
    } else {
      // Multiple variations exist - this is complex case
      // For now, distribute the quantity proportionally or update the first variation
      // and remove others (simplified approach)
      updateQuantity(itemVariations[0].uniqueId, newQty);
      for (let i = 1; i < itemVariations.length; i++) {
        updateQuantity(itemVariations[i].uniqueId, 0);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Reusable Contextual Greeting Component */}
      <ContextualGreeting 
        contextualInfo={contextualInfo}
        variant="default"
        showWeather={true}
        showTimeInfo={true}
      />

      {/* Mode Toggle */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            {useSmartDiscovery ? t("menu.smart_discovery") : t("menu.browse_categories")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDiscoveryMode}
            className="flex items-center space-x-2"
          >
            {useSmartDiscovery ? (
              <>
                <List className="h-4 w-4" />
                <span>{t("menu.view_classic")}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{t("menu.view_smart")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {useSmartDiscovery ? (
        <SmartDiscoveryMenu
          categories={categories}
          locale="en" // You may want to get this from props or context
          addToCart={addToCartSimple}
          updateQty={updateQtySimple}
          getQty={getQtySimple}
          brandColor={restaurantSettings.primaryColor || '#0ea5e9'}
          canAddItems={canAddItems}
          setView={setView}
          tableId={viewProps.tableId}
          sessionId={viewProps.sessionId}
          tableNumber={viewProps.tableNumber}
          restaurantSettings={restaurantSettings}
        />
      ) : (
        <MenuList
          categories={categories}
          searchPlaceholder={t("search_placeholder")}
          locale="en" // You may want to get this from props or context
          addToCart={addToCartSimple}
          updateQty={updateQtySimple}
          getQty={getQtySimple}
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
