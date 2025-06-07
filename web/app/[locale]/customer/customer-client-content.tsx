"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, @next/next/no-img-element */

import React, { useState, ReactNode } from "react";

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

// Types
import type { RestaurantSettings, Category, TableInfo } from "@/shared/types/customer";

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
}

export function CustomerClientContent({
  restaurantSettings,
  categories,
  tables,
  tableId,
}: CustomerClientContentProps) {
  const [view, setViewState] = useState<
    "menu" | "checkout" | "orderplaced" | "thankyou" | "review" | "booking" | "admin"
  >("menu");
  const [viewProps, setViewProps] = useState<any>({ tableId }); 

  const setView = (v: string, props: any = {}) => {
    setViewState(v as any); 
    setViewProps(props);
    window.scrollTo(0, 0);
  };

  const layoutFeatureFlags = { aiChat: FEATURE_FLAGS.aiChat };
  const menuScreenFeatureFlags = { tableBooking: FEATURE_FLAGS.tableBooking };
  const reviewOrderScreenFeatureFlags = { onlinePayment: FEATURE_FLAGS.onlinePayment };
  const thankYouScreenFeatureFlags = { advancedReviews: FEATURE_FLAGS.advancedReviews };
  const reviewScreenFeatureFlags = { advancedReviews: FEATURE_FLAGS.advancedReviews };
  const bookingScreenFeatureFlags = { tableBooking: FEATURE_FLAGS.tableBooking };

  let ScreenComponent: ReactNode | null = null;

  switch (view) {
    case "menu":
      ScreenComponent = (
        <CustomerMenuScreen
          setView={setView}
          restaurantSettings={restaurantSettings}
          viewProps={viewProps}
          categories={categories}
          featureFlags={menuScreenFeatureFlags}
        />
      );
      break;
    case "checkout":
      ScreenComponent = (
        <ReviewOrderScreen
          setView={setView}
          restaurantSettings={restaurantSettings}
          viewProps={viewProps}
          featureFlags={reviewOrderScreenFeatureFlags}
        />
      );
      break;
    case "orderplaced":
      ScreenComponent = (
        <OrderPlacedScreen
          setView={setView}
          restaurantSettings={restaurantSettings}
          viewProps={viewProps}
        />
      );
      break;
    case "thankyou":
      ScreenComponent = (
        <ThankYouScreen
          setView={setView}
          restaurantSettings={restaurantSettings}
          viewProps={viewProps}
          featureFlags={thankYouScreenFeatureFlags}
        />
      );
      break;
    case "review":
      ScreenComponent = (
        <ReviewScreen
          setView={setView}
          restaurantSettings={restaurantSettings}
          viewProps={viewProps}
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
          // viewProps could be passed if booking is initiated with specific context
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
          viewProps={{ tableId }} // Reset to initial props
          categories={categories}
          featureFlags={menuScreenFeatureFlags}
        />
      );
      console.warn("Unknown view state, defaulting to menu:", view);
  }

  return (
    <CartProvider>
      <CustomerLayout
        setView={setView}
        restaurantSettings={restaurantSettings}
        featureFlags={layoutFeatureFlags}
      >
        {ScreenComponent}
      </CustomerLayout>
    </CartProvider>
  );
}
