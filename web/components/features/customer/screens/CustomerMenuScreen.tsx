// web/components/features/customer/screens/CustomerMenuScreen.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MenuList } from "@/components/features/customer/MenuList";
import { FloatingCart } from "@/components/features/customer/FloatingCart";
import { useCart } from "../CartContext";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings, Category, MenuItem } from "@/shared/types/customer";
import { MenuViewProps, ViewProps, ViewType } from "./types";

interface CustomerMenuScreenProps {
  setView: (view: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: MenuViewProps;
  categories: Category[];
  featureFlags: {
    tableBooking: boolean;
  };
  canAddItems?: boolean; // This can be part of viewProps or a direct prop if sessionData is not fully integrated into viewProps yet
  sessionData?: { // This might be better handled by passing relevant parts into viewProps
    sessionId: string | null;
    tableId: string | null;
    tableNumber: string | null;
    canOrder: boolean;
    sessionExpiry: string | null;
  };
}

export function CustomerMenuScreen({
  setView,
  restaurantSettings,
  viewProps,
  categories,
  featureFlags,
  canAddItems: propCanAddItems,
  sessionData,
}: CustomerMenuScreenProps) {
  const t = useTranslations("Customer");
  const { cart, addToCart, updateQuantity, totalCartItems, totalCartPrice } = useCart();
  const [showAddedToCartMsg, setShowAddedToCartMsg] = useState("");
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'expired' | 'invalid'>('checking');
  const [menu] = useState<Category[]>(categories);
  const locale = useGetCurrentLocale();
  
  // Consolidate prop access
  const tableId = sessionData?.tableId || viewProps?.tableId;
  const sessionId = sessionData?.sessionId || viewProps?.sessionId;
  const tableNumber = sessionData?.tableNumber || viewProps?.tableNumber;
  // Prefer canAddItems from viewProps if available, then sessionData, then direct prop
  const canAddItems = viewProps?.canAddItems ?? sessionData?.canOrder ?? propCanAddItems ?? false;

  // Check session status periodically for updates
  useEffect(() => {
    if (!sessionId) {
      setSessionStatus('invalid');
      return;
    }

    const checkSessionStatus = async () => {
      try {
        const response = await fetch(`/api/v1/sessions/check?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.canAddItems) {
            setSessionStatus('valid');
          } else {
            setSessionStatus('expired');
          }
        } else {
          setSessionStatus('invalid');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setSessionStatus('invalid');
      }
    };

    // Initial check
    if (canAddItems) {
      setSessionStatus('valid');
    } else {
      checkSessionStatus();
    }

    // Check every 30 seconds for session updates
    const interval = setInterval(checkSessionStatus, 30000);
    return () => clearInterval(interval);
  }, [sessionId, canAddItems]);

  const handleAddToCart = (item: MenuItem, quantity = 1) => {
    if (!canAddItems || sessionStatus !== 'valid') {
      return;
    }
    
    addToCart(item, quantity);
    setShowAddedToCartMsg(
      t("menu.item_added_to_cart_msg", {
        item: getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_jp":item.name_ja}, locale),
      }),
    );
    setTimeout(() => setShowAddedToCartMsg(""), 2000);
  };

  const getQuantityInCart = (itemId: string) =>
    cart.find((ci) => ci.itemId === itemId)?.qty || 0;

  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const weekdays = ["", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  // Show session expired message
  if (sessionStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Order Completed</h1>
          <p className="text-gray-600 mb-6">
            Your order has been completed. Thank you for dining with us!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You can still view the menu, but ordering is no longer available for this session.
          </p>
          <Button 
            onClick={() => setView("menu", { ...viewProps, canAddItems: false })}
            variant="outline"
          >
            View Menu Only
          </Button>
        </div>
      </div>
    );
  }

  // Greeting and basic guide for valid table sessions
  const showGreeting = tableId && canAddItems && sessionStatus === 'valid';

  return (
    <div>
      {showGreeting && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Welcome to {restaurantSettings.name || 'Our Restaurant'}!
          </h3>
          <p className="text-green-700 text-sm mb-2">
            Table {tableNumber} • Session Active
          </p>
          <p className="text-green-600 text-sm">
            Browse our menu, add items to your cart, and place your order when ready. 
            You can continue adding items until you checkout.
          </p>
        </div>
      )}

      {!canAddItems && tableId && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Menu View Only</p>
            <p className="text-sm">
              {sessionStatus === 'invalid' 
                ? 'Invalid table ID. You can view the menu but cannot place orders.'
                : 'Your session has expired. You can view the menu but cannot place orders.'
              }
            </p>
          </div>
        </Alert>
      )}

      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">
        {t("menu.title")}
      </h2>
      <p className="text-center text-sm mb-6 text-slate-500 dark:text-slate-400">
        {t("menu.serving_today", { day: t(`weekdays.${weekdays[today]}`) })}
      </p>

      {showAddedToCartMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <Alert>{showAddedToCartMsg}</Alert>
        </div>
      )}

      <MenuList
        categories={menu.sort((a, b) => a.position - b.position)}
        locale={locale}
        searchPlaceholder={t("menu.search_placeholder")}
        addToCart={handleAddToCart}
        updateQty={canAddItems ? updateQuantity : undefined}
        getQty={getQuantityInCart}
        brandColor={restaurantSettings.primaryColor || "#0ea5e9"}
        recommended={menu[0]?.menu_items.slice(0, 2) || []}
        canAddItems={canAddItems && sessionStatus === 'valid'}
        setView={setView} // Added
        tableId={tableId} // Added
        sessionId={sessionId} // Added
        tableNumber={tableNumber} // Added
      />

      {canAddItems && sessionStatus === 'valid' && (
        <FloatingCart
          count={totalCartItems}
          total={totalCartPrice}
          onCheckout={() => setView("checkout", { tableId, sessionId, tableNumber })}
          brandColor={restaurantSettings.primaryColor || "#0ea5e9"}
        />
      )}

      {featureFlags.tableBooking && (
        <div className="text-center mt-12">
          <Button
            onClick={() => setView("booking")}
            size="lg"
            style={{ backgroundColor: restaurantSettings.secondaryColor || restaurantSettings.primaryColor }}
            className="text-white hover:opacity-90"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            {t("booking.book_table_button")}
          </Button>
        </div>
      )}
    </div>
  );
}
