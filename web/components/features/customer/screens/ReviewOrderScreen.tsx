// web/components/features/customer/screens/ReviewOrderScreen.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderSummary } from "@/components/features/customer/OrderSummary";
import { useCart } from "../CartContext";
import { getCurrentLocale } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";

interface ReviewOrderScreenProps {
  setView: (v: string, props?: any) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: any;
  featureFlags: {
    onlinePayment: boolean;
  };
}

export function ReviewOrderScreen({
  setView,
  restaurantSettings,
  viewProps,
  featureFlags,
}: ReviewOrderScreenProps) {
  const t = useTranslations("Customer");
  const { cart, totalCartPrice, clearCart, updateQuantity } = useCart(); // Added updateQuantity
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (cart.length === 0 && !isConfirmModalOpen) {
      setView("menu", viewProps);
    }
  }, [cart, isConfirmModalOpen, setView, viewProps]);

  if (cart.length === 0 && !isConfirmModalOpen) {
    return <p>{t("checkout.redirecting_empty_cart")}</p>;
  }

  const handleIncreaseQuantity = (itemId: string) => {
    const item = cart.find(c => c.itemId === itemId);
    if (item) {
      updateQuantity(itemId, item.qty + 1);
    }
  };

  const handleDecreaseQuantity = (itemId: string) => {
    const item = cart.find(c => c.itemId === itemId);
    if (item) {
      updateQuantity(itemId, item.qty - 1); // updateQuantity handles qty <= 0 by removing item
    }
  };

  const handleSetQuantity = (itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity); // updateQuantity handles qty <= 0 by removing item
  };

  const handleConfirmOrder = async () => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      alert(t("checkout.session_not_found_alert") || "Session not found. Please go back to the menu and try again.");
      return;
    }
    const payload = {
      sessionId,
      items: cart.map((c) => ({ menuItemId: c.itemId, quantity: c.qty })),
    };
    try {
      const res = await fetch("/api/v1/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.orderId) {
        setIsConfirmModalOpen(false);
        setView("orderplaced", {
          orderId: data.orderId,
          items: cart,
          total: totalCartPrice,
          tableId: viewProps?.tableId,
        });
        clearCart();
      } else {
        alert(data.error || t("checkout.order_failed_error") || "Failed to place order.");
      }
    } catch (error) {
      console.error("Order submission error:", error);
      alert(t("checkout.order_failed_error_network") || "An error occurred. Please try again.");
    }
  };

  return (
    <div>
      <Button
        onClick={() => setView("menu", viewProps)}
        variant="ghost"
        className="mb-4 -ml-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("checkout.back_to_menu")}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
        {t("checkout.title")}
      </h2>
      <OrderSummary
        items={cart}
        total={totalCartPrice}
        locale={getCurrentLocale()}
        className="max-w-lg mx-auto p-4"
        isAdjustable={true}
        onIncreaseQuantity={handleIncreaseQuantity}
        onDecreaseQuantity={handleDecreaseQuantity}
        onSetQuantity={handleSetQuantity}
      />
      <p className="mt-6 text-sm text-center text-slate-600 dark:text-slate-400">
        {viewProps?.tableId
          ? t("checkout.payment_instruction_table", {
              tableId: viewProps.tableId,
            })
          : t("checkout.payment_instruction_counter")}
      </p>
        {!featureFlags.onlinePayment && (
          <Button
            onClick={() => setIsConfirmModalOpen(true)}
            size="lg"
            className="w-full mt-6 text-white hover:opacity-90"
            style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
            disabled={cart.length === 0}
          >
            {t("checkout.place_order_button")} (
            {t("currency_format", { value: totalCartPrice })})
          </Button>
        )}
      {/* TODO: Implement online payment button if featureFlags.onlinePayment is true */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("checkout.confirm_modal_title")}</DialogTitle>
          </DialogHeader>
          <p className="mb-4">
            {t("checkout.confirm_modal_text", {
              total: t("currency_format", { value: totalCartPrice }),
            })}
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmOrder}
              style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
