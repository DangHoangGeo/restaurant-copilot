// web/components/features/customer/screens/ThankYouScreen.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Star, Clock, Utensils, Truck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings } from "@/shared/types/customer";
import { ViewProps, ViewType, ThankYouScreenViewProps, MenuViewProps, ReviewViewProps, CheckoutViewProps } from "./types";

interface ThankYouScreenProps {
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  viewProps: ThankYouScreenViewProps;
}

interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  status: 'ordered' | 'preparing' | 'ready' | 'served';
  created_at: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  unit_price: number;
  total: number;
  menu_item_id: string;
}

interface Order {
  id: string;
  session_id: string;
  guest_count: number;
  status: string;
  table_id: string | null;
  table_name: string | null;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export function ThankYouScreen({
  setView,
  restaurantSettings,
  viewProps,
}: ThankYouScreenProps) {
  const t = useTranslations("Customer");
  const tCommon = useTranslations("Common");
  const { orderId, sessionId, tableId, tableNumber } = viewProps;
  const locale = useGetCurrentLocale();
  
  // State for order history
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const canShowReviewButton = true;

  const fetchOrderHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (tableId) params.append('tableId', tableId);
      if (sessionId) params.append('sessionId', sessionId); // Using orderId as sessionId for now

      const response = await fetch(`/api/v1/orders/session-info?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.orders || null);
      }
    } catch (error) {
      console.error("Failed to fetch order history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();

    // Poll for updates every 30 seconds only if order is active
    let interval: NodeJS.Timeout;
    if (order && order.status !== 'completed' && order.status !== 'cancelled') {
      interval = setInterval(fetchOrderHistory, 30000);
      return () => clearInterval(interval);
    }
  }, [tableId, sessionId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Utensils className="h-4 w-4" />;
      case 'ready':
        return <Truck className="h-4 w-4" />;
      case 'served':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'served':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ordered':
        return t("thankyou.status_ordered");
      case 'preparing':
        return t("thankyou.status_preparing");
      case 'ready':
        return t("thankyou.status_ready");
      case 'served':
        return t("thankyou.status_completed");
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <CheckCircle
        className="mx-auto mb-6 text-green-500 dark:text-green-400"
        size={64}
      />
      <h2 className="text-3xl font-bold mb-3">{t("thankyou.title")}</h2>
      <p
        className="text-lg font-semibold mb-2"
        style={{ color: restaurantSettings.primaryColor || "#0ea5e9" }}
      >
        {t("thankyou.order_id_label")}: {orderId.substring(28, 36)}
      </p>

      {tableNumber && (
        <Card className="max-w-2xl mx-auto p-2 mb-4">
          <h3 className="font-semibold text-lg">
            {t("thankyou.table_number_label")}: {tableNumber}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {order && order.status !== "completed" ? t("session_active_more") : t("thankyou.inactive_session_message")}
          </p>
          
          {/* Session sharing passcode */}
          {order && order.status !== "completed" && order.status !== "expired" && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                {t("session.share_passcode")}
              </p>
              <div className="bg-gray-100 p-2 rounded-lg mb-2">
                <span className="text-xl font-mono font-bold tracking-widest text-blue-600">
                  {order.id.substring(0,4).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {t("session.passcode_instruction")}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Order History */}
      {order ? (
        <Card className="max-w-2xl mx-auto p-4 mb-8 text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg">{t("current_session")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">
                {t("currency_format", { value: order.total_amount })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {order.items.length} {order.items.length === 1 ? t("thankyou.item") : t("thankyou.items")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">
                    {getLocalizedText({ "name_en": item.name_en, "name_vi": item.name_vi, "name_jp": item.name_ja }, locale)}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t("menu.item_quantity", {quantity: item.quantity})}
                    </p>
                    <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        {getStatusText(item.status)}
                      </span>
                    </Badge>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t("menu.item_notes",{notes: item.notes})}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium">
                    {t("currency_format", { value: item.total })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="max-w-md mx-auto p-4 mb-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            {t("no_order_items")}
          </p>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button
          onClick={() => setView("menu", { tableId, tableNumber, canAddItems: true } as MenuViewProps)}
          style={{ backgroundColor: restaurantSettings.secondaryColor || restaurantSettings.primaryColor }}
          className="text-white hover:opacity-90"
        >
          {tCommon("add_more_items")}
        </Button>
        
        {/* Checkout button instead of order history */}
        {order && order.status !== "completed" && (
          <Button
            onClick={() => setView("checkout", { tableId, sessionId: sessionId, tableNumber } as CheckoutViewProps)}
            style={{ backgroundColor: restaurantSettings.primaryColor }}
            className="text-white hover:opacity-90"
          >
            <CreditCard className="h-4 w-4 mr-1" />
            {t("orderhistory.checkout_button")}
          </Button>
        )}
        
        {canShowReviewButton && (
          <Button
            onClick={() => setView("review", { sessionId, items: viewProps.items, canAddItems: false } as ReviewViewProps)}
            variant="outline"
            style={{ borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor }}
            className="hover:opacity-90"
          >
            <Star className="h-4 w-4 mr-1" />
            {t("thankyou.review_button")}
          </Button>
        )}
      </div>
      
      <div className="mt-8">
        <Button
          onClick={() => setView("menu", { tableId, tableNumber, canAddItems: true } as MenuViewProps)}
          variant="link"
          className="text-sm"
        >
          {tCommon("back_to_menu")}
        </Button>
      </div>
    </div>
  );
}
