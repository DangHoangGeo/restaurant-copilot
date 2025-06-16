"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CartProvider, useCart } from "../CartContext";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerFooter } from "./CustomerFooter";
import { FloatingCart } from "../FloatingCart";
import { AIAssistant } from "./AIAssistant";
import { Skeleton } from "@/components/ui/skeletons/skeleton";
import type { RestaurantSettings } from "@/shared/types/customer";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

function CustomerLayoutContent({ children }: CustomerLayoutProps) {
  const t = useTranslations("Customer");
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { totalCartItems, totalCartPrice } = useCart();

  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Determine current context for AI Assistant
  const currentContext = pathname.includes('/menu') 
    ? 'menu' 
    : pathname.includes('/cart') 
      ? 'cart' 
      : pathname.includes('/order') 
        ? 'order' 
        : 'menu';

  // Fetch restaurant settings
  useEffect(() => {
    const fetchRestaurantSettings = async () => {
      try {
        const subdomain = window.location.hostname.split('.')[0];
        const response = await fetch(`/api/v1/customer/restaurant?subdomain=${subdomain}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant data');
        }
        
        const data = await response.json();
        setRestaurantSettings(data);
      } catch (error) {
        console.error('Error fetching restaurant settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantSettings();
  }, []);

  // Check and restore session
  useEffect(() => {
    const storedSessionId = localStorage.getItem('coorder_session_id');
    
    if (storedSessionId) {
      // Validate session
      fetch(`/api/v1/customer/session/check?sessionId=${storedSessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setSessionId(storedSessionId);
          } else {
            localStorage.removeItem('coorder_session_id');
          }
        })
        .catch(err => {
          console.error('Error checking session:', err);
          localStorage.removeItem('coorder_session_id');
        });
    }
  }, []);

  // Handle navigation
  const handleCartClick = () => {
    router.push(`/${params.locale}/cart`);
  };

  const handleOrderHistoryClick = () => {
    router.push(`/${params.locale}/history`);
  };

  // Show loading skeleton if restaurant settings not loaded yet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24 mt-1" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurantSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            {t("restaurant_not_found")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {t("restaurant_not_found_message")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <CustomerHeader
        restaurantSettings={restaurantSettings}
        onCartClick={handleCartClick}
        onOrderHistoryClick={handleOrderHistoryClick}
        cartItemCount={totalCartItems}
        showOrderHistory={!!sessionId}
      />
      
      <main className="flex-1">
        {children}
      </main>
      
      <CustomerFooter restaurantSettings={restaurantSettings} />
      
      {totalCartItems > 0 && (
        <FloatingCart
          count={totalCartItems}
          total={totalCartPrice}
          onCheckout={handleCartClick}
          brandColor={restaurantSettings.primaryColor || "#4f46e5"}
        />
      )}
      
      <AIAssistant
        isOpen={isAIOpen}
        onToggle={() => setIsAIOpen(!isAIOpen)}
        restaurantName={restaurantSettings.name}
        currentContext={currentContext as 'menu' | 'cart' | 'order'}
      />
    </div>
  );
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <CartProvider>
      <CustomerLayoutContent>
        {children}
      </CustomerLayoutContent>
    </CartProvider>
  );
}
