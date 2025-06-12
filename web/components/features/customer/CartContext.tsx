// web/components/features/customer/CartContext.tsx
"use client";
import React, { useState, createContext, useContext, ReactNode } from "react";
import type { MenuItem, MenuItemSize, Topping } from "@/shared/types/customer";

export interface CartItem {
  uniqueId: string;
  itemId: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number;
  qty: number;
  imageUrl?: string;
  description_en?: string;
  description_ja?: string;
  description_vi?: string;
  selectedSize?: MenuItemSize;
  selectedToppings?: Topping[];
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, selectedSize?: MenuItemSize, selectedToppings?: Topping[]) => void;
  updateQuantity: (uniqueId: string, qty: number) => void;
  getQuantityInCart: (uniqueId: string) => number; // Added
  removeFromCart: (uniqueId: string) => void; // Added
  totalCartItems: number;
  totalCartPrice: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (
    item: MenuItem,
    quantity = 1,
    selectedSize?: MenuItemSize,
    selectedToppings?: Topping[],
  ) => {
    setCart((prev) => {
      const toppingIds = selectedToppings
        ?.map((t) => t.id)
        .sort()
        .join("_");
      const uniqueId = `${item.id}${selectedSize ? `_${selectedSize.id}` : ""}${
        toppingIds ? `_${toppingIds}` : ""
      }`;

      let itemPrice = item.price;
      if (selectedSize) {
        itemPrice = selectedSize.price; // Use size price if available
      }
      if (selectedToppings) {
        itemPrice += selectedToppings.reduce((sum, t) => sum + t.price, 0);
      }

      const existing = prev.find((ci) => ci.uniqueId === uniqueId);
      if (existing) {
        return prev.map((ci) =>
          ci.uniqueId === uniqueId
            ? { ...ci, qty: ci.qty + quantity }
            : ci,
        );
      }
      return [
        ...prev,
        {
          uniqueId,
          itemId: item.id,
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi,
          price: itemPrice,
          qty: quantity,
          imageUrl: item.image_url || undefined,
          description_en: item.description_en || undefined,
          description_ja: item.description_ja || undefined,
          description_vi: item.description_vi || undefined,
          selectedSize,
          selectedToppings,
        },
      ];
    });
  };

  const updateQuantity = (uniqueId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.uniqueId === uniqueId ? { ...c, qty } : c)),
      );
    }
  };

  const getQuantityInCart = (uniqueId: string): number => {
    const item = cart.find((ci) => ci.uniqueId === uniqueId);
    return item ? item.qty : 0;
  };

  const removeFromCart = (uniqueId: string) => {
    setCart((prev) => prev.filter((ci) => ci.uniqueId !== uniqueId));
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
        getQuantityInCart, // Added
        removeFromCart, // Added
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
