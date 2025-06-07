// web/components/features/customer/screens/CustomerMenuScreen.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MenuList } from "@/components/features/customer/MenuList";
import { FloatingCart } from "@/components/features/customer/FloatingCart";
import { useCart } from "../CartContext";
import { getCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings, Category, MenuItem } from "@/shared/types/customer";

interface CustomerMenuScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: any;
  categories: Category[];
  featureFlags: {
    tableBooking: boolean;
  };
}

export function CustomerMenuScreen({
  setView,
  restaurantSettings,
  viewProps,
  categories,
  featureFlags,
}: CustomerMenuScreenProps) {
  const t = useTranslations("Customer");
  const { cart, addToCart, updateQuantity, totalCartItems, totalCartPrice } = useCart();
  const [showAddedToCartMsg, setShowAddedToCartMsg] = useState("");
  const [menu] = useState<Category[]>(categories);
  const locale = getCurrentLocale();
  const tableId = viewProps?.tableId;
  const sessionStatus = viewProps?.sessionStatus || "new";

  useEffect(() => {
    if (tableId) {
      const existing = localStorage.getItem("sessionId");
      if (!existing) {
        fetch(`/api/v1/sessions/create?tableId=${tableId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.sessionId) {
              localStorage.setItem("sessionId", data.sessionId);
            }
          })
          .catch(() => { /* Handle error silently or log */ });
      }
    }
  }, [tableId]);

  const handleAddToCart = (item: MenuItem, quantity = 1) => {
    addToCart(item, quantity);
    setShowAddedToCartMsg(
      t("menu.item_added_to_cart_msg", {
        item: getLocalizedText(item, locale),
      }),
    );
    setTimeout(() => setShowAddedToCartMsg(""), 2000);
  };

  const getQuantityInCart = (itemId: string) =>
    cart.find((ci) => ci.itemId === itemId)?.qty || 0;

  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const weekdays = ["", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  if (sessionStatus === "expired") {
    return (
      <Alert className="max-w-md mx-auto" variant="destructive">
        {t("session.expired_message")}
      </Alert>
    );
  }

  return (
    <div>
      {tableId && (
        <p className="text-center text-sm mb-4 text-slate-600 dark:text-slate-400">
          {t("menu.ordering_for_table", { tableId })}
        </p>
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
        updateQty={updateQuantity}
        getQty={getQuantityInCart}
        brandColor={restaurantSettings.primaryColor || "#0ea5e9"}
        recommended={menu[0]?.menu_items.slice(0, 2) || []}
      />
      <FloatingCart
        count={totalCartItems}
        total={totalCartPrice}
        onCheckout={() => setView("checkout", { tableId })}
        brandColor={restaurantSettings.primaryColor || "#0ea5e9"}
      />
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
