"use client";
import React, { useState, useEffect } from "react";
import { CustomerMenuScreen } from "./screens/CustomerMenuScreen";
import { ReviewOrderScreen } from "./screens/ReviewOrderScreen";
import { ThankYouScreen } from "./screens/ThankYouScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { CartProvider } from "./CartContext";
import type { RestaurantSettings, Category } from "@/shared/types/customer";

interface CustomerClientContentProps {
  restaurantSettings: RestaurantSettings;
  categories: Category[];
  tables: any[];
  tableId?: string;
  sessionData: {
    sessionId?: string;
    tableNumber?: string;
    sessionStatus: 'valid' | 'expired' | 'invalid' | 'new';
    canAddItems: boolean;
  };
  featureFlags?: {
    onlinePayment: boolean;
    advancedReviews: boolean;
    tableBooking: boolean;
  };
}

export function CustomerClientContent({ 
  restaurantSettings, 
  categories,
  tables,
  tableId,
  sessionData: initialSessionData,
  featureFlags = {
    onlinePayment: false,
    advancedReviews: false,
    tableBooking: true
  }
}: CustomerClientContentProps) {
  const [view, setView] = useState("menu");
  const [viewProps, setViewProps] = useState<any>({});
  const [sessionData, setSessionData] = useState({
    sessionId: initialSessionData.sessionId || null,
    tableId: tableId || null,
    tableNumber: initialSessionData.tableNumber || null,
    canOrder: initialSessionData.canAddItems || false,
    sessionExpiry: null as string | null
  });

  // Enhanced setView function that also handles props
  const handleSetView = (newView: string, props?: any) => {
    setView(newView);
    setViewProps(props || {});
  };

  // Load session data on mount and sync with localStorage
  useEffect(() => {
    if (initialSessionData.sessionId) {
      localStorage.setItem("sessionId", initialSessionData.sessionId);
    }
    if (tableId) {
      localStorage.setItem("tableId", tableId);
    }
    if (initialSessionData.tableNumber) {
      localStorage.setItem("tableNumber", initialSessionData.tableNumber);
    }

    // Also check localStorage for existing session data
    const storedSessionId = localStorage.getItem("sessionId");
    const storedTableId = localStorage.getItem("tableId");
    const storedTableNumber = localStorage.getItem("tableNumber");
    
    if (storedSessionId && storedTableId && !initialSessionData.sessionId) {
      // Validate existing session
      validateSession(storedSessionId);
    }

    setSessionData({
      sessionId: initialSessionData.sessionId || storedSessionId,
      tableId: tableId || storedTableId,
      tableNumber: initialSessionData.tableNumber || storedTableNumber,
      canOrder: initialSessionData.canAddItems || false,
      sessionExpiry: localStorage.getItem("sessionExpiry")
    });
  }, [initialSessionData, tableId]);

  const validateSession = async (sessionId: string) => {
    try {
      const response = await fetch("/api/v1/sessions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!data.success || !data.isActive) {
        // Session expired or invalid, clear local storage
        localStorage.removeItem("sessionId");
        localStorage.removeItem("tableId");
        localStorage.removeItem("tableNumber");
        localStorage.removeItem("sessionExpiry");
        
        setSessionData({
          sessionId: null,
          tableId: null,
          tableNumber: null,
          canOrder: false,
          sessionExpiry: null
        });
      } else {
        // Update session data with validated info
        setSessionData({
          sessionId: data.session.id,
          tableId: data.session.table_id,
          tableNumber: data.session.table_number,
          canOrder: true,
          sessionExpiry: data.session.expires_at
        });
      }
    } catch (error) {
      console.error("Session validation error:", error);
      // On error, clear session data to be safe
      localStorage.removeItem("sessionId");
      localStorage.removeItem("tableId");
      localStorage.removeItem("tableNumber");
      localStorage.removeItem("sessionExpiry");
      
      setSessionData({
        sessionId: null,
        tableId: null,
        tableNumber: null,
        canOrder: false,
        sessionExpiry: null
      });
    }
  };

  const renderView = () => {
    const commonProps = {
      setView: handleSetView,
      restaurantSettings,
      viewProps: { ...viewProps, ...sessionData },
      featureFlags
    };

    switch (view) {
      case "menu":
        return (
          <CustomerMenuScreen 
            {...commonProps}
            categories={categories}
            canAddItems={sessionData.canOrder}
            sessionData={sessionData}
          />
        );
      case "checkout":
        return <ReviewOrderScreen {...commonProps} />;
      case "thankyou":
        return <ThankYouScreen {...commonProps} />;
      case "review":
        return <ReviewScreen {...commonProps} />;
      default:
        return (
          <CustomerMenuScreen 
            {...commonProps}
            categories={categories}
            canAddItems={sessionData.canOrder}
            sessionData={sessionData}
          />
        );
    }
  };

  return (
    <CartProvider>
      {renderView()}
    </CartProvider>
  );
}