"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShoppingCart, X, Minus, Plus, Edit } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useMemo } from "react";
import Image from "next/image";
import { useCart } from "./CartContext";
import { getLocalizedText, useGetCurrentLocale } from "@/lib/customerUtils";
import { ItemDetailModal } from "./menu/ItemDetailModal";
import type { CartItem } from "./CartContext";
import type {
  MenuItemSize,
  Topping,
  MenuItem,
  FoodItem,
} from "@/shared/types/menu";
import {
  appendBranchContext,
  getOrgIdentifierFromHost,
} from "@/lib/customer-branch";

interface Props {
  count: number;
  total: number;
  onPlaceOrder: () => Promise<void> | void;
  brandColor: string;
  locale?: string;
  branchCode?: string | null;
  restaurantId?: string;
}

export function FloatingCart({
  count,
  total,
  onPlaceOrder,
  brandColor,
  branchCode,
  restaurantId,
}: Props) {
  const t = useTranslations("customer.cart");
  const tMenu = useTranslations("customer.menu");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [originalMenuItem, setOriginalMenuItem] = useState<MenuItem | null>(
    null,
  );
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { cart, updateQuantity, removeFromCart, addToCart } = useCart();
  const currentLocale = useGetCurrentLocale();

  // Memoize modal props to prevent infinite re-renders
  const memoizedInitialToppings = useMemo(
    () => editingItem?.selectedToppings || [],
    [editingItem],
  );

  const memoizedInitialNotes = useMemo(
    () => editingItem?.notes || "",
    [editingItem],
  );

  if (count === 0) return null;

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleUpdateQuantity = (uniqueId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(uniqueId);
    } else {
      updateQuantity(uniqueId, newQty);
    }
  };

  const handleEditItem = async (item: CartItem) => {
    setEditingItem(item);

    // Fetch the original menu item data to get all available sizes and toppings
    try {
      const params = new URLSearchParams();
      if (restaurantId) {
        params.set("restaurantId", restaurantId);
      } else {
        appendBranchContext(params, {
          branchCode,
          orgIdentifier: getOrgIdentifierFromHost(window.location.host),
        });
      }

      const response = await fetch(
        `/api/v1/customer/menu?${params.toString()}`,
      );
      if (response.ok) {
        const menuData = await response.json();

        // Find the original menu item
        let originalItem: MenuItem | null = null;
        for (const category of menuData.categories) {
          const foundItem = category.menu_items.find(
            (menuItem: MenuItem) => menuItem.id === item.itemId,
          );
          if (foundItem) {
            originalItem = foundItem;
            break;
          }
        }

        if (originalItem) {
          setOriginalMenuItem(originalItem);
        }
      }
    } catch (error) {
      console.error("Failed to fetch original menu item:", error);
    }

    setIsEditModalOpen(true);
  };

  const handleSaveEditedItem = (
    item: FoodItem,
    quantity: number,
    selectedSize?: MenuItemSize,
    selectedToppings?: Topping[],
    notes?: string,
  ) => {
    if (editingItem) {
      // Remove the old item
      removeFromCart(editingItem.uniqueId);

      // Add the updated item
      addToCart(item, quantity, selectedSize, selectedToppings, notes);
    }

    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handlePlaceOrder = async () => {
    if (count === 0 || isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      await onPlaceOrder();
      setIsExpanded(false);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderCartItem = (item: CartItem) => {
    const localizedItemName = getLocalizedText(
      {
        name_en: item.name_en,
        name_ja: item.name_ja || "",
        name_vi: item.name_vi || "",
      },
      currentLocale,
    );

    const detailsDisplay: string[] = [];

    if (item.selectedSize) {
      const localizedSizeName = getLocalizedText(
        {
          name_en: item.selectedSize.name_en,
          name_ja: item.selectedSize.name_ja || "",
          name_vi: item.selectedSize.name_vi || "",
        },
        currentLocale,
      );
      detailsDisplay.push(localizedSizeName);
    }

    if (item.selectedToppings && item.selectedToppings.length > 0) {
      const toppingNames = item.selectedToppings
        .map((t) =>
          getLocalizedText(
            {
              name_en: t.name_en || "",
              name_ja: t.name_ja || "",
              name_vi: t.name_vi || "",
            },
            currentLocale,
          ),
        )
        .join(", ");
      detailsDisplay.push(`+${toppingNames}`);
    }

    return (
      <motion.div
        key={item.uniqueId}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex items-start gap-3 py-3 border-b border-slate-200 dark:border-slate-600 last:border-b-0"
      >
        {/* Item Image */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={localizedItemName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => handleEditItem(item)}
                className="text-left w-full group hover:bg-slate-50 dark:hover:bg-slate-700 rounded p-1 -m-1 transition-colors"
              >
                <p
                  className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  title={localizedItemName}
                >
                  {localizedItemName}
                  <Edit className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>

                {/* Size and Toppings */}
                {(item.selectedSize ||
                  (item.selectedToppings && item.selectedToppings.length > 0) ||
                  item.notes) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.selectedSize && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-blue-100 text-blue-700"
                      >
                        {getLocalizedText(
                          {
                            name_en: item.selectedSize.name_en,
                            name_ja: item.selectedSize.name_ja || "",
                            name_vi: item.selectedSize.name_vi || "",
                          },
                          currentLocale,
                        )}
                      </Badge>
                    )}
                    {item.selectedToppings &&
                      item.selectedToppings.map((topping, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-green-200 text-green-700"
                        >
                          +
                          {getLocalizedText(
                            {
                              name_en: topping.name_en || "",
                              name_ja: topping.name_ja || "",
                              name_vi: topping.name_vi || "",
                            },
                            currentLocale,
                          )}
                        </Badge>
                      ))}
                    {item.notes && (
                      <Badge
                        variant="outline"
                        className="text-xs border-orange-200 text-orange-700"
                      >
                        📝{" "}
                        {item.notes.length > 20
                          ? `${item.notes.substring(0, 20)}...`
                          : item.notes}
                      </Badge>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ¥{item.price} each
                </p>
              </button>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleUpdateQuantity(item.uniqueId, item.qty - 1)
                }
                className="h-11 w-11 p-0 rounded-full"
                aria-label={t("decrease_quantity")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[1.5rem] text-center">
                {item.qty}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleUpdateQuantity(item.uniqueId, item.qty + 1)
                }
                className="h-11 w-11 p-0 rounded-full"
                aria-label={t("increase_quantity")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className="fixed left-4 right-4 z-[9999] flex justify-center pointer-events-none"
      style={{
        bottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
      }}
    >
      <div className="w-full max-w-md pointer-events-auto">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-2"
            >
              <Card className="p-4 shadow-2xl bg-white dark:bg-slate-800 border-2 max-h-[500px] overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t("floating_cart.title")}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleExpanded}
                    className="h-8 w-8 p-0"
                    aria-label={tCommon("close_modal")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cart Items */}
                <div className="space-y-0 max-h-80 overflow-y-auto scrollbar-thin mb-4">
                  <AnimatePresence>
                    {cart.map((item) => renderCartItem(item))}
                  </AnimatePresence>
                </div>

                {/* Total and Place Order */}
                <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {t("floating_cart.total", { amount: total.toFixed(0) })}
                    </span>
                    <span
                      className="font-bold text-lg"
                      style={{ color: brandColor }}
                    >
                      ¥{total.toFixed(0)}
                    </span>
                  </div>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder || count === 0}
                    className="w-full text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brandColor }}
                  >
                    {isPlacingOrder ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="mr-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </motion.div>
                        {t("floating_cart.placing_order")}...
                      </>
                    ) : (
                      <>
                        {t("floating_cart.place_order")}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Cart Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <Card
            className="shadow-2xl bg-opacity-100 dark:bg-opacity-100 border-2 overflow-hidden cursor-pointer"
            style={{
              backgroundColor: brandColor,
              borderColor: brandColor,
            }}
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-white">
                <button
                  onClick={handleToggleExpanded}
                  className="flex items-center space-x-3 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? t("floating_cart.title") : t("floating_cart.view_cart")}
                >
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    <motion.div
                      key={count}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-white text-slate-800 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold"
                    >
                      {count}
                    </motion.div>
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {t("floating_cart.items_count", { count })}
                    </p>
                    <p className="text-xs opacity-90">
                      {t("floating_cart.total", { amount: total.toFixed(0) })}
                    </p>
                  </div>
                </button>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <Button
                    onClick={handleToggleExpanded}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? tCommon("close_modal") : t("floating_cart.view_cart")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Item Edit Modal */}
        {editingItem && originalMenuItem && (
          <ItemDetailModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingItem(null);
              setOriginalMenuItem(null);
            }}
            item={{
              id: originalMenuItem.id,
              name_en: originalMenuItem.name_en,
              name_ja: originalMenuItem.name_ja,
              name_vi: originalMenuItem.name_vi,
              description_en: originalMenuItem.description_en,
              description_ja: originalMenuItem.description_ja,
              description_vi: originalMenuItem.description_vi,
              price: originalMenuItem.price,
              image_url: originalMenuItem.image_url,
              available: originalMenuItem.available ?? true,
              weekday_visibility: originalMenuItem.weekday_visibility ?? [
                1, 2, 3, 4, 5, 6, 7,
              ],
              position: originalMenuItem.position ?? 0,
              // Use all available sizes and toppings from the original menu item
              menu_item_sizes: originalMenuItem.menu_item_sizes || [],
              toppings: originalMenuItem.toppings || [],
            }}
            locale={currentLocale}
            brandColor={brandColor}
            onAddToCart={handleSaveEditedItem}
            canAddItems={true}
            isEditMode={true}
            initialQuantity={editingItem.qty}
            initialSelectedSize={editingItem.selectedSize || null}
            initialSelectedToppings={memoizedInitialToppings}
            initialNotes={memoizedInitialNotes}
          />
        )}
      </div>
    </div>
  );
}
