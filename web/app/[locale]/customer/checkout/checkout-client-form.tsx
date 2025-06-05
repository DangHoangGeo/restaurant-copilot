"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { useCart } from "@/hooks/use-cart"; // Assuming this hook exists
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Trash2, PlusSquare, MinusSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils/currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// Placeholder types (should be imported)
interface CartItem {
  id: string; // menuItemId
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
}
interface RestaurantSettings {
  id: string;
  name: string;
  currency: string;
  primaryColor: string;
  // other settings
}

// Placeholder for useCart hook
const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([
    // Example items for development
    { id: "item-1-uuid", name: "Delicious Pizza", price: 1500, quantity: 2, imageUrl: "https://source.unsplash.com/random/100x100/?pizza" },
    { id: "item-2-uuid", name: "Tasty Burger", price: 1200, quantity: 1, imageUrl: "https://source.unsplash.com/random/100x100/?burger" },
  ]);
  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    cart: items,
    removeFromCart: (itemId: string) => setItems(prev => prev.filter(item => item.id !== itemId)),
    updateQuantity: (itemId: string, quantity: number) => {
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item).filter(item => item.quantity > 0))
    },
    totalCartPrice,
    totalCartItems,
    clearCart: () => setItems([]),
  };
};


interface CheckoutClientFormProps {
  restaurantSettings: RestaurantSettings;
  initialSessionId: string | null; // Retrieved from cookie on server
}

export default function CheckoutClientForm({
  restaurantSettings,
  initialSessionId,
}: CheckoutClientFormProps) {
  const t = useTranslations("CheckoutPage");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, totalCartPrice, clearCart } = useCart();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSessionId) {
      // This should ideally be handled by the page component redirecting earlier
      // but as a fallback:
      alert(t("sessionNotFound")); // Replace with a better notification
      router.push(`/${locale}/customer`);
    }
    if (cart.length === 0 && !isLoading) {
      // alert(t("cartEmpty")); // Can be annoying if it pops up during loading/redirect
      router.push(`/${locale}/customer`);
    }
  }, [cart, initialSessionId, router, locale, isLoading, t]);

  const handleConfirmOrder = async () => {
    if (!initialSessionId) {
      setError(t("sessionNotFound"));
      return;
    }
    setError(null);
    setIsLoading(true);

    const orderPayload = {
      sessionId: initialSessionId,
      items: cart.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        notes: item.notes || null,
      })),
    };

    try {
      const response = await fetch("/api/v1/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details?.map((d: any) =>d.message).join(', ') || t("errorPlacingOrder"));
      }

      clearCart();
      router.push(`/${locale}/customer/thank-you?orderId=${result.orderId}`);
    } catch (err: any) {
      console.error("Order creation failed:", err);
      setError(err.message || t("errorPlacingOrder"));
    } finally {
      setIsLoading(false);
      setIsConfirmModalOpen(false);
    }
  };

  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const primaryButtonTextColor = getTextColor(restaurantSettings.primaryColor);


  if (cart.length === 0) {
    // Render a message or rely on useEffect to redirect
    return <p>{t("cartEmptyRedirect")}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("yourCartTitle")}</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{tCommon("alert.error.title")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 mb-6">
        {cart.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded object-cover"/>
              )}
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.price, restaurantSettings.currency, locale)} x {item.quantity}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                <MinusSquare className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center">{item.quantity}</span>
              <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                <PlusSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border rounded-lg mb-6">
        <div className="flex justify-between items-center text-xl font-semibold">
          <span>{t("totalLabel")}</span>
          <span>{formatCurrency(totalCartPrice, restaurantSettings.currency, locale)}</span>
        </div>
      </div>

      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogTrigger asChild>
          <Button
            className="w-full text-lg py-6"
            disabled={isLoading}
            style={{backgroundColor: restaurantSettings.primaryColor, color: primaryButtonTextColor }}
          >
            {isLoading ? t("confirmingOrder") : t("confirmCashOrderButton")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmOrderModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("confirmOrderModalDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>{t("cancelButton")}</Button>
            </DialogClose>
            <Button
                onClick={handleConfirmOrder}
                disabled={isLoading}
                style={{backgroundColor: restaurantSettings.primaryColor, color: primaryButtonTextColor }}
            >
              {isLoading ? t("confirmingOrder") : t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
