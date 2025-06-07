// web/components/features/customer/CartContext.tsx
"use client";
import React, { useState, createContext, useContext, ReactNode } from "react";
import type { MenuItem } from "@/shared/types/customer";

export interface CartItem {
  itemId: string;
  name: string; // Changed from MenuItem to string
  price: number;
  qty: number;
  imageUrl?: string;
  description?: string; // Changed from MenuItem to string
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, qty?: number) => void;
  updateQuantity: (id: string, qty: number) => void;
  totalCartItems: number;
  totalCartPrice: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Helper function to get localized text
  const getLocalizedName = (item: MenuItem) => {
    // Try to get current locale from URL or context, fallback to English
    return item.name_en || item.name_ja || item.name_vi || "Item";
  };

  const getLocalizedDescription = (item: MenuItem) => {
    return item.description_en || item.description_ja || item.description_vi || "";
  };

  const addToCart = (item: MenuItem, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.itemId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.itemId === item.id ? { ...ci, qty: ci.qty + quantity } : ci,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: getLocalizedName(item), // Extract localized name as string
          price: item.price,
          qty: quantity,
          imageUrl: item.image_url || undefined,
          description: getLocalizedDescription(item), // Extract localized description as string
        },
      ];
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.itemId !== id));
    } else {
      setCart((prev) => prev.map((c) => (c.itemId === id ? { ...c, qty } : c)));
    }
  };

  const clearCart = () => setCart([]);

  const totalCartItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        totalCartItems,
        totalCartPrice,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
