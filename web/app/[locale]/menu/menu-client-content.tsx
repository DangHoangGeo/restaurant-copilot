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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSubdomainFromHost } from "@/lib/utils";
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
import { History } from "lucide-react";
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
  const [passcode, setPasscode] = useState<string>('');
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(sessionData.sessionStatus === 'join');
  const [showPasscodeDisplay, setShowPasscodeDisplay] = useState<boolean>(false);
  const [sessionPasscode, setSessionPasscode] = useState<string>('');

  // Store session data in localStorage when valid and sync with server
  useEffect(() => {
    const syncSessionData = async () => {
      // Always store the session data from server
      if (sessionData.sessionId) {
        localStorage.setItem("sessionId", sessionData.sessionId);
        localStorage.setItem("tableId", tableId || "");
        localStorage.setItem("tableNumber", sessionData.tableNumber || "");
        
        // Redirect to sessionId URL if not already there
        const currentUrl = new URL(window.location.href);
        const currentSessionId = currentUrl.searchParams.get('sessionId');
        if (currentSessionId !== sessionData.sessionId) {
          // Update URL with sessionId parameter
          currentUrl.searchParams.delete('code');
          currentUrl.searchParams.delete('tableId');
          currentUrl.searchParams.set('sessionId', sessionData.sessionId);
          window.history.replaceState({}, '', currentUrl.toString());
        }
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
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({ tableId });
      params.append('guests', String(guestCount));
      if (subdomain) params.append('subdomain', subdomain);
      const res = await fetch(`/api/v1/sessions/create?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("sessionId", data.sessionId);
        localStorage.setItem("guestCount", String(data.guestCount || guestCount));
        
        // Update view props
        setViewProps(prev => ({
          ...prev,
          sessionId: data.sessionId,
          tableNumber: data.tableNumber,
          canAddItems: true,
          guestCount: data.guestCount,
          orderId: data.orderId,
        }));
        
        // Show passcode to the first user if this is a new session
        if (data.isNewSession && data.passcode) {
          setSessionPasscode(data.passcode);
          setShowPasscodeDisplay(true);
        }
        
        // Redirect to sessionId URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('code');
        currentUrl.searchParams.delete('tableId');
        currentUrl.searchParams.set('sessionId', data.sessionId);
        window.history.replaceState({}, '', currentUrl.toString());
        
        setShowGuestDialog(false);
      } else {
        alert(data.error || "Failed to start session");
      }
    } catch (e) {
      console.error("session start error", e);
    }
  };

  const joinSession = async (passcode: string) => {
    if (!sessionData.pendingSessionId) return;
    if (!passcode) {
      alert("Please enter a valid passcode");
      return;
    }
    try {
      const subdomain = getSubdomainFromHost(window.location.host);
      const params = new URLSearchParams({ sessionId: sessionData.pendingSessionId, passcode });
      if (subdomain) params.append('subdomain', subdomain);
      const res = await fetch(`/api/v1/sessions/join?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('sessionId', data.sessionId);
        setViewProps(prev => ({
          ...prev,
          sessionId: data.sessionId,
          tableNumber: data.tableNumber,
          canAddItems: data.canAddItems,
          guestCount: data.guestCount,
        }));
        
        // Redirect to sessionId URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('code');
        currentUrl.searchParams.delete('tableId');
        currentUrl.searchParams.set('sessionId', data.sessionId);
        window.history.replaceState({}, '', currentUrl.toString());
        
        setShowJoinDialog(false);
      } else {
        alert(data.error || 'Failed to join session');
      }
    } catch (e) {
      console.error('join session error', e);
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
          <h1 className="text-2xl font-bold mb-4 text-red-600">{t("session.session_expired")}</h1>
          <p className="text-gray-600 mb-6">
            {t("session.session_expired_message")}
          </p>
          <p className="text-sm text-gray-500">
          {t("session.session_expired_instruction")}
          </p>
          <Button
          onClick={() => setView("thankyou", viewProps as MenuViewProps)}
          variant="outline"
          className="hover:opacity-90"
        >
        <History className="h-4 w-4 mr-1" />

          {t("thankyou.order_history_button")}
        </Button>
        </div>
      </div>
    );
  } else if (view === "invalid") {
    ScreenComponent = (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">{t("session.")}</h1>
          <p className="text-gray-600 mb-6">
          {t("session.invalid_table_message")}
          </p>
          <p className="text-sm text-gray-500">
          {t("session.invalid_table_instruction")}
          </p>
          {/* Allow viewing menu without ordering capability */}
          <button 
            onClick={() => setView("menu", { canAddItems: false } as MenuViewProps)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
           {t("session.view_menu_only")}
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
            restaurantSettings={{...restaurantSettings, logoUrl: restaurantSettings?.logoUrl || undefined}}
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
              sessionId: tyvp.sessionId || "",
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
            restaurantSettings={{...restaurantSettings, logoUrl: restaurantSettings?.logoUrl || undefined}}
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
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("session.enter_passcode_title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {t("session.ask_for_passcode_instruction")}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={()=>joinSession(passcode)} className="w-full" style={{ backgroundColor: restaurantSettings.primaryColor || '#0ea5e9' }}>
              {t("session.join_session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("guest_dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setGuestCount(Number.isFinite(v) && v > 0 ? v : 1);
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={startSession} className="w-full" style={{ backgroundColor: restaurantSettings.primaryColor || '#0ea5e9' }}>
              {t("guest_dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Passcode Display Dialog for First User */}
      <Dialog open={showPasscodeDisplay} onOpenChange={setShowPasscodeDisplay}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("session.created_title")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-4">
              {t("session.share_passcode")}
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <span className="text-2xl font-mono font-bold tracking-widest text-blue-600">
                {sessionPasscode.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {t("session.passcode_instruction")}
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowPasscodeDisplay(false)} 
              className="w-full" 
              style={{ backgroundColor: restaurantSettings.primaryColor || '#0ea5e9' }}
            >
              {t("session.start_ordering")}
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
