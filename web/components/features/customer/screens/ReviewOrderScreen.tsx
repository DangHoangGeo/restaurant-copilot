// web/components/features/customer/screens/ReviewOrderScreen.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MinusCircle, PlusCircle, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { useCart } from "../CartContext";
import type { RestaurantSettings } from "@/shared/types/customer";
// import { getCurrentLocale } from "@/lib/customerUtils"; // Not used
import { CheckoutViewProps, ViewProps, ViewType, MenuViewProps, ThankYouScreenViewProps } from "./types"; // Updated imports

interface ReviewOrderScreenProps {
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps?: CheckoutViewProps; // Use specific CheckoutViewProps
  featureFlags: {
    onlinePayment: boolean;
  };
}

export function ReviewOrderScreen({
  setView,
  restaurantSettings,
  viewProps,
}: ReviewOrderScreenProps) {
  const t = useTranslations("Customer");
  const tCommon = useTranslations("Common");
  const { cart, clearCart, totalCartPrice, updateQuantity } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [editingNoteForItem, setEditingNoteForItem] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  //const locale = getCurrentLocale();

  const tableId = viewProps?.tableId;
  const sessionId = viewProps?.sessionId || localStorage.getItem("sessionId");
  const tableNumber = viewProps?.tableNumber || localStorage.getItem("tableNumber");

  useEffect(() => {
    if (cart.length === 0 && !isConfirmModalOpen) {
      // Pass necessary props for menu view
      setView("menu", { tableId, sessionId, tableNumber, canAddItems: true } as MenuViewProps);
    }
  }, [cart, isConfirmModalOpen, setView, tableId, sessionId, tableNumber]);

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

  const handleEditNote = (itemId: string) => {
    setEditingNoteForItem(itemId);
    setTempNote(itemNotes[itemId] || "");
  };

  const handleSaveNote = () => {
    if (editingNoteForItem) {
      setItemNotes(prev => ({
        ...prev,
        [editingNoteForItem]: tempNote
      }));
      setEditingNoteForItem(null);
      setTempNote("");
    }
  };

  const handleCancelNote = () => {
    setEditingNoteForItem(null);
    setTempNote("");
  };

  const handleConfirmOrder = async () => {
    if (!sessionId) {
      alert(t("checkout.session_not_found_alert") || "Session not found. Please go back to the menu and try again.");
      return;
    }

    if (cart.length === 0) {
      alert(t("checkout.empty_cart_alert") || "Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sessionId,
        items: cart.map((c) => ({ 
          menuItemId: c.itemId, 
          quantity: c.qty,
          notes: itemNotes[c.itemId] || specialInstructions || undefined
        })),
      };

      const res = await fetch("/api/v1/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.orderId) {
        setIsConfirmModalOpen(false);
        // Prepare cart items for thank you screen
        const orderItems = cart.map(item => ({
          itemId: item.itemId,
          name: item.name,
          qty: item.qty,
          price: item.price,
          quantity: item.qty, // For compatibility
          itemName: item.name // For compatibility
        }));
        
        setView("thankyou", {
          orderId: data.orderId,
          items: orderItems,
          total: totalCartPrice,
          tableId,
          tableNumber,
        } as ThankYouScreenViewProps); // Cast to ThankYouScreenViewProps
        clearCart();
      } else {
        alert(data.error || t("checkout.order_failed_error") || "Failed to place order.");
      }
    } catch (error) {
      console.error("Order submission error:", error);
      alert(t("checkout.order_failed_error_network") || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">{t("checkout.empty_cart_title")}</h2>
          <p className="text-gray-600 mb-6">{t("checkout.empty_cart_message")}</p>
          <Button
            onClick={() => setView("menu", { tableId, sessionId, tableNumber, canAddItems: true } as MenuViewProps)}
            style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
            className="text-white hover:opacity-90"
          >
            {tCommon("back_to_menu")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button
          onClick={() => setView("menu", { tableId, sessionId, tableNumber, canAddItems: true } as MenuViewProps)}
          variant="ghost"
          size="sm"
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
      </div>

      {tableNumber && (
        <Alert className="mb-6">
          <div>
            <p className="font-medium">{t("checkout.table_info", { number: tableNumber })}</p>
            <p className="text-sm text-gray-600">{t("checkout.session_active")}</p>
          </div>
        </Alert>
      )}

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("checkout.order_summary")}</h2>
        <div className="space-y-4">
          {cart.map((item) => (
            <div key={item.itemId} className="border-b pb-4 last:border-b-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">
                      {item.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(item.itemId)}
                      className="p-1 h-auto text-gray-500 hover:text-gray-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t("currency_format", { value: item.price })} each
                  </p>
                  {itemNotes[item.itemId] && (
                    <p className="text-sm text-blue-600 italic mb-2">
                      Note: {itemNotes[item.itemId]}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDecreaseQuantity(item.itemId)}
                        className="h-8 w-8 p-0"
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 min-w-[40px] text-center">
                        {item.qty}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIncreaseQuantity(item.itemId)}
                        className="h-8 w-8 p-0"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateQuantity(item.itemId, 0)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {t("currency_format", { value: item.price * item.qty })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center text-xl font-bold pt-4">
            <span>{t("checkout.total")}</span>
            <span>{t("currency_format", { value: totalCartPrice })}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("checkout.special_instructions")}</h2>
        <Textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder={t("checkout.special_instructions_placeholder")}
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-gray-500 mt-1">
          {specialInstructions.length}/200 {t("checkout.characters")}
        </p>
      </Card>
	  
      <Button
        onClick={() => setIsConfirmModalOpen(true)}
        disabled={isSubmitting}
        size="lg"
        style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
        className="w-full text-white hover:opacity-90"
      >
        {isSubmitting ? t("checkout.placing_order") : t("checkout.place_order")}
      </Button>

      {/* Item Note Edit Modal */}
      {editingNoteForItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              Add Note for {cart.find(c => c.itemId === editingNoteForItem)?.name}
            </h3>
            <Textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Any special requests for this item..."
              rows={3}
              maxLength={150}
              className="mb-2"
            />
            <p className="text-xs text-gray-500 mb-4">
              {tempNote.length}/150 characters
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelNote}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
                className="flex-1 text-white hover:opacity-90"
              >
                Save Note
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t("checkout.confirm_order")}</h3>
            <p className="text-gray-600 mb-6">
              {t("checkout.confirm_message", { 
                total: t("currency_format", { value: totalCartPrice }),
                items: cart.length
              })}
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                {t("checkout.cancel")}
              </Button>
              <Button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
                className="flex-1 text-white hover:opacity-90"
              >
                {isSubmitting ? t("checkout.confirming") : t("checkout.confirm")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
