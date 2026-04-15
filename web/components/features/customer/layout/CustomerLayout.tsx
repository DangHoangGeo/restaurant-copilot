"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CartProvider, useCart } from "../CartContext";
import { CustomerDataProvider, useCustomerData } from "./CustomerDataContext";
import type { CartItem } from "../CartContext";
import type { RestaurantSettings } from "@/shared/types/customer";
import { CustomerFooter } from "./CustomerFooter";
import { FloatingCart } from "../FloatingCart";
//import { AIAssistant } from "./AIAssistant";
import { Skeleton } from "@/components/ui/skeletons/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface CustomerLayoutProps {
  children: React.ReactNode;
  locale: string;
  initialSettings?: RestaurantSettings | null;
}

function CustomerLayoutContent({ children, locale }: CustomerLayoutProps) {
  const t = useTranslations("customer");
  const tSession = useTranslations("customer/session");
  //const params = useParams();
  const router = useRouter();
  const { totalCartItems, totalCartPrice, cart, clearCart } = useCart();
  const { restaurantSettings, sessionData, isLoading, error } = useCustomerData();
  const { toast } = useToast();

  //const [isAIOpen, setIsAIOpen] = useState(false);

  // Determine current context for AI Assistant
  //const currentContext = pathname.includes('/menu') ? 'menu': pathname.includes('/order') ? 'order' : 'menu';

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!sessionData.sessionId) {
      toast({
        title: tSession("session_required"),
        description: tSession("session_required_message"),
        variant: "destructive",
      });
      return;
    }
    if (!restaurantSettings) {
      toast({
        title: tSession("order_failed"),
        description: tSession("try_again_later"),
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert cart items to API format
      const orderItems = cart.map((cartItem: CartItem) => ({
        menuItemId: cartItem.itemId,
        quantity: cartItem.qty,
        notes: cartItem.notes || undefined,
        menu_item_size_id: cartItem.selectedSize?.id || undefined,
        topping_ids: cartItem.selectedToppings?.map((t) => t.id) || undefined,
      }));

      const response = await fetch('/api/v1/customer/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          restaurantId: restaurantSettings?.id,
          items: orderItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      if (data.success) {
        // Clear the cart after successful order
        clearCart();
        
        // Redirect to order history page
        router.push(`/${locale}/history?sessionId=${sessionData.sessionId}`);
      } else {
        throw new Error(data.error || 'Order placement failed');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: tSession("order_failed"),
        description: error instanceof Error ? error.message : tSession("try_again_later"),
        variant: "destructive",
      });
    }
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

  if (error || !restaurantSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            {t("restaurant_not_found")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {error || t("restaurant_not_found_message")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="flex-1">
        {children}
      </main>
      
      <CustomerFooter restaurantSettings={restaurantSettings} />
      
      {totalCartItems > 0 && (
        <FloatingCart
          count={totalCartItems}
          total={totalCartPrice}
          onPlaceOrder={handlePlaceOrder}
          brandColor={restaurantSettings.primaryColor || "#4f46e5"}
        />
      )}
      {/**  AI Assistant Component 
      <AIAssistant
        isOpen={isAIOpen}
        onToggle={() => setIsAIOpen(!isAIOpen)}
        restaurantName={restaurantSettings.name}
        currentContext={currentContext as 'menu' | 'cart' | 'order'}
      />*/}
    </div>
  );
}

export function CustomerLayout({ children, locale, initialSettings }: CustomerLayoutProps) {
  return (
    <CustomerDataProvider initialSettings={initialSettings}>
      <CartProvider>
        <CustomerLayoutContent locale={locale}>
          {children}
        </CustomerLayoutContent>
      </CartProvider>
    </CustomerDataProvider>
  );
}
