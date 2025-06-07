"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, @next/next/no-img-element */

import React, { useState, ReactNode, useEffect } from "react";
import { useTranslations } from "next-intl";

// Context
import { CartProvider } from "@/components/features/customer/CartContext";

// Layout
import { CustomerLayout } from "@/components/features/customer/CustomerLayout";

// Screens
import { CustomerMenuScreen } from "@/components/features/customer/screens/CustomerMenuScreen";
import { ReviewOrderScreen } from "@/components/features/customer/screens/ReviewOrderScreen";
import { OrderPlacedScreen } from "@/components/features/customer/screens/OrderPlacedScreen";
import { ThankYouScreen } from "@/components/features/customer/screens/ThankYouScreen";
import { ReviewScreen } from "@/components/features/customer/screens/ReviewScreen";
import { BookingScreen } from "@/components/features/customer/screens/BookingScreen";
import { OrderHistoryScreen } from "@/components/features/customer/screens/OrderHistoryScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Types
import type { RestaurantSettings, Category, TableInfo } from "@/shared/types/customer";
import { 
  ViewType, 
  ViewProps, 
  MenuViewProps, 
  CheckoutViewProps, 
  OrderPlacedScreenViewProps, 
  ThankYouScreenViewProps,
  ReviewViewProps,
  MenuItemDetailViewProps, // Added import
  SessionData // Import SessionData
} from "@/components/features/customer/screens/types"; // Updated imports
import CustomerMenuItemDetailScreen from "@/components/features/customer/screens/CustomerMenuItemDetailScreen";

// Define FEATURE_FLAGS locally or import from a central config.
// These will be passed down to relevant components.
const FEATURE_FLAGS = {
  tableBooking: true,
  onlinePayment: false,
  aiChat: false, 
  advancedReviews: true,
};

interface CustomerClientContentProps {
  restaurantSettings: RestaurantSettings;
  categories: Category[];
  tables: TableInfo[];
  tableId?: string;
  sessionData: SessionData;
}

export function CustomerClientContent({
  restaurantSettings,
  categories,
  tables,
  tableId,
  sessionData,
}: CustomerClientContentProps) {
  const t = useTranslations("Customer");
  const [view, setViewState] = useState<ViewType>("menu"); // Use ViewType
  const [viewProps, setViewProps] = useState<ViewProps>({ // Use ViewProps union type
    tableId,
    sessionId: sessionData.sessionId,
    tableNumber: sessionData.tableNumber,
    canAddItems: sessionData.canAddItems,
    guestCount: sessionData.guestCount,
    orderId: sessionData.orderId, // Initialize with orderId from sessionData
  });
  const [guestCount, setGuestCount] = useState<number>(sessionData.guestCount || 1);
  const [showGuestDialog, setShowGuestDialog] = useState<boolean>(!!tableId && sessionData.sessionStatus === 'new' && !sessionData.sessionId);

  // Store session data in localStorage when valid and sync with server
  useEffect(() => {
    const syncSessionData = async () => {
      // Always store the session data from server
      if (sessionData.sessionId) {
        localStorage.setItem("sessionId", sessionData.sessionId);
        localStorage.setItem("tableId", tableId || "");
        localStorage.setItem("tableNumber", sessionData.tableNumber || "");
      }

      // Check if local sessionId differs from server sessionId
      const localSessionId = localStorage.getItem("sessionId");
      if (localSessionId && localSessionId !== sessionData.sessionId) {
        console.log("Session ID mismatch detected, validating with server...");
        
        // Validate the local session ID with server
        try {
          const response = await fetch(`/api/v1/sessions/check?sessionId=${localSessionId}`);
          const data = await response.json();
          
          if (data.success && data.sessionStatus === "active") {
            // Local session is still valid, update viewProps to use it
      
            setViewProps(prev => ({
              ...prev,
              sessionId: localSessionId,
              canAddItems: data.canAddItems
            }));
          } else {
            // Local session is invalid, use server session
            setViewProps(prev => ({
              ...prev,
              sessionId: sessionData.sessionId,
              canAddItems: sessionData.canAddItems
            }));
          }
        } catch (error) {
          console.error("Session validation error:", error);
          // On error, use server session
          setViewProps(prev => ({
            ...prev,
            sessionId: sessionData.sessionId,
            canAddItems: sessionData.canAddItems
          }));
        }
      }
    };

    syncSessionData();
  }, [sessionData.sessionId, tableId, sessionData.tableNumber, sessionData.canAddItems]);

  // Handle session status on mount
  useEffect(() => {
    if (sessionData.sessionStatus === 'expired' || sessionData.sessionStatus === 'invalid') {
      setViewState(sessionData.sessionStatus);
    }
  }, [sessionData.sessionStatus]);

  const setView = (v: ViewType, props: ViewProps = {}) => { // Use ViewType and ViewProps
    setViewState(v);
    setViewProps(prev => ({ ...prev, ...props })); // Merge props carefully
    window.scrollTo(0, 0);
  };

  const startSession = async () => {
    if (!tableId) return;
    try {
      const res = await fetch(`/api/v1/sessions/create?tableId=${tableId}&guests=${guestCount}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("sessionId", data.sessionId);
        setViewProps(prev => ({
          ...prev,
          sessionId: data.sessionId,
          tableNumber: data.tableNumber,
          canAddItems: true,
          guestCount: data.guestCount,
        }));
        setShowGuestDialog(false);
      } else {
        alert(data.error || "Failed to start session");
      }
    } catch (e) {
      console.error("session start error", e);
    }
  };

  const layoutFeatureFlags = { aiChat: FEATURE_FLAGS.aiChat };
  const menuScreenFeatureFlags = { tableBooking: FEATURE_FLAGS.tableBooking };
  const reviewOrderScreenFeatureFlags = { onlinePayment: FEATURE_FLAGS.onlinePayment };
  //const thankYouScreenFeatureFlags = { advancedReviews: FEATURE_FLAGS.advancedReviews };
  const reviewScreenFeatureFlags = { advancedReviews: FEATURE_FLAGS.advancedReviews };
  const bookingScreenFeatureFlags = { tableBooking: FEATURE_FLAGS.tableBooking };

  let ScreenComponent: ReactNode | null = null;

  // Handle session expired or invalid states
  if (view === "expired") {
    ScreenComponent = (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Session Expired</h1>
          <p className="text-gray-600 mb-6">
            Your order session has been completed or expired. Thank you for your visit!
          </p>
          <p className="text-sm text-gray-500">
            To place a new order, please scan the QR code on your table again.
          </p>
        </div>
      </div>
    );
  } else if (view === "invalid") {
    ScreenComponent = (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Invalid Table</h1>
          <p className="text-gray-600 mb-6">
            The table ID is invalid or doesn&apos;t belong to this restaurant.
          </p>
          <p className="text-sm text-gray-500">
            Please scan a valid QR code from a table at this restaurant.
          </p>
          {/* Allow viewing menu without ordering capability */}
          <button 
            onClick={() => setView("menu", { canAddItems: false } as MenuViewProps)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            View Menu Only
          </button>
        </div>
      </div>
    );
  } else {
    // Normal flow screens
    switch (view) {
      case "menu":
        ScreenComponent = (
          <CustomerMenuScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as MenuViewProps} // Cast to specific view prop type
            categories={categories}
            featureFlags={menuScreenFeatureFlags}
            canAddItems={(viewProps as MenuViewProps).canAddItems} // Correctly access canAddItems
          />
        );
        break;
      case "checkout":
        ScreenComponent = (
          <ReviewOrderScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as CheckoutViewProps} // Cast
            featureFlags={reviewOrderScreenFeatureFlags}
          />
        );
        break;
      
      case "orderplaced":
          // Ensure all required props for OrderPlacedScreenViewProps are present
          const opvp = viewProps as OrderPlacedScreenViewProps;
        ScreenComponent = (
          <OrderPlacedScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={{
              orderId: opvp.orderId || "", // Ensure orderId is a string
              items: opvp.items || [],     // Ensure items is an array
              total: opvp.total || 0,       // Ensure total is a number
              tableId: opvp.tableId,
            }}
          />
        );
        break;
      case "thankyou":
        // Ensure all required props for ThankYouScreenViewProps are present
        const tyvp = viewProps as ThankYouScreenViewProps;
        ScreenComponent = (
          <ThankYouScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={{
              orderId: tyvp.orderId || "",
              items: tyvp.items || [],
              total: tyvp.total || 0,
              tableId: tyvp.tableId,
              tableNumber: tyvp.tableNumber,
            }}
          />
        );
        break;
      case "review":
        ScreenComponent = (
          <ReviewScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as ReviewViewProps} // Cast
            featureFlags={reviewScreenFeatureFlags}
          />
        );
        break;
      case "orderhistory":
        ScreenComponent = (
          <OrderHistoryScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as MenuViewProps} // OrderHistory uses MenuViewProps
          />
        );
        break;
      case "booking":
        ScreenComponent = (
          <BookingScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            tables={tables}
            categories={categories}
            featureFlags={bookingScreenFeatureFlags}
            viewProps={viewProps as ViewProps} // Cast
          />
        );
        break;
      case "menuitemdetail":
        ScreenComponent = (
          <CustomerMenuItemDetailScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as MenuItemDetailViewProps} // Cast
          />
        );
        break;
      case "admin":
        // This case implies that CustomerLayout's "admin" button click is handled by setView.
        // If "admin" is a separate page/route, CustomerLayout should navigate directly.
        // If it's a view within this component, an AdminScreen would be rendered.
        // For now, assuming CustomerLayout handles the navigation for "admin".
        ScreenComponent = <p>Redirecting to admin panel...</p>; // Placeholder
        // Or, if admin is a view managed here:
        // import AdminScreen from "...";
        // ScreenComponent = <AdminScreen setView={setView} ... />;
        break;
      default:
        // Fallback to menu for any unknown view state
        ScreenComponent = (
          <CustomerMenuScreen
            setView={setView}
            restaurantSettings={restaurantSettings}
            viewProps={viewProps as MenuViewProps} // Cast
            categories={categories}
            featureFlags={menuScreenFeatureFlags}
            canAddItems={(viewProps as MenuViewProps).canAddItems} // Correctly access canAddItems
          />
        );
        console.warn("Unknown view state, defaulting to menu:", view);
    }
  }

  return (
    <>
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("guest_dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value))} />
          </div>
          <DialogFooter>
            <Button onClick={startSession} className="w-full" style={{ backgroundColor: restaurantSettings.primaryColor || '#0ea5e9' }}>
              {t("guest_dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CartProvider>
        <CustomerLayout
          setView={setView}
          restaurantSettings={restaurantSettings}
          featureFlags={layoutFeatureFlags}
        >
          {ScreenComponent}
        </CustomerLayout>
      </CartProvider>
    </>
  );
}
