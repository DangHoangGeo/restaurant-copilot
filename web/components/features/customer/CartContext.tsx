// web/components/features/customer/CartContext.tsx
"use client";
import React, {
  useState,
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import type { MenuItem, MenuItemSize, Topping } from "@/shared/types/customer";

export interface CartItem {
  uniqueId: string;
  itemId: string;
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  price: number;
  qty: number;
  imageUrl?: string;
  description_en?: string;
  description_ja?: string;
  description_vi?: string;
  selectedSize?: MenuItemSize;
  selectedToppings?: Topping[];
  notes?: string;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, selectedSize?: MenuItemSize, selectedToppings?: Topping[], notes?: string) => void;
  updateQuantity: (uniqueId: string, qty: number) => void;
  getQuantityInCart: (uniqueId: string) => number; // Added
  getQuantityByItemId: (itemId: string) => number; // Helper for simple cart interface
  removeFromCart: (uniqueId: string) => void; // Added
  totalCartItems: number;
  totalCartPrice: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback(
    (
      item: MenuItem,
      quantity = 1,
      selectedSize?: MenuItemSize,
      selectedToppings?: Topping[],
      notes?: string,
    ) => {
      setCart((prev) => {
        const toppingIds = selectedToppings
          ?.map((t) => t.id)
          .sort()
          .join("_");
        const uniqueId = `${item.id}${
          selectedSize ? `_${selectedSize.id}` : ""
        }${toppingIds ? `_${toppingIds}` : ""}${
          notes ? `_${notes.substring(0, 10)}` : ""
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
            ci.uniqueId === uniqueId ? { ...ci, qty: ci.qty + quantity } : ci,
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
            notes,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback((uniqueId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.uniqueId === uniqueId ? { ...c, qty } : c)),
      );
    }
  }, []);

  const getQuantityInCart = useCallback(
    (uniqueId: string): number => {
      const item = cart.find((ci) => ci.uniqueId === uniqueId);
      return item ? item.qty : 0;
    },
    [cart],
  );

  const quantityMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((item) => {
      map.set(item.itemId, (map.get(item.itemId) || 0) + item.qty);
    });
    return map;
  }, [cart]);

  const getQuantityByItemId = useCallback(
    (itemId: string): number => {
      return quantityMap.get(itemId) || 0;
    },
    [quantityMap],
  );

  const removeFromCart = useCallback((uniqueId: string) => {
    setCart((prev) => prev.filter((ci) => ci.uniqueId !== uniqueId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const totalCartItems = useMemo(
    () => cart.reduce((sum, i) => sum + i.qty, 0),
    [cart],
  );
  const totalCartPrice = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.qty, 0),
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      updateQuantity,
      getQuantityInCart,
      getQuantityByItemId,
      removeFromCart,
      totalCartItems,
      totalCartPrice,
      clearCart,
    }),
    [
      cart,
      addToCart,
      updateQuantity,
      getQuantityInCart,
      getQuantityByItemId,
      removeFromCart,
      totalCartItems,
      totalCartPrice,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
