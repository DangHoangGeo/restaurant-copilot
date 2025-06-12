"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ShoppingCart, X, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useCart } from "./CartContext";
import { getLocalizedText, useGetCurrentLocale } from "@/lib/customerUtils";

interface Props {
  count: number;
  total: number;
  onCheckout: () => void;
  brandColor: string;
  locale?: string;
}

export function FloatingCart({ count, total, onCheckout, brandColor }: Props) {
  const t = useTranslations("Customer");
  const [isExpanded, setIsExpanded] = useState(false);
  const { cart, updateQuantity, removeFromCart } = useCart();
  const currentLocale = useGetCurrentLocale();

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

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] flex justify-center pointer-events-none">
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
              <Card className="p-4 shadow-2xl bg-white dark:bg-slate-800 border-2 max-h-80 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    Your Order
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleExpanded}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {cart.map((item) => {
                    const localizedItemName = getLocalizedText({ name_en: item.name_en, name_ja: item.name_ja, name_vi: item.name_vi }, currentLocale);
                    const detailsDisplay: string[] = [];
                    if (item.selectedSize) {
                      const localizedSizeName = getLocalizedText({ name_en: item.selectedSize.name_en, name_ja: item.selectedSize.name_ja, name_vi: item.selectedSize.name_vi }, currentLocale);
                      detailsDisplay.push(localizedSizeName);
                    }
                    if (item.selectedToppings && item.selectedToppings.length > 0) {
                      const toppingNames = item.selectedToppings.map(t => getLocalizedText({ name_en: t.name_en, name_ja: t.name_ja, name_vi: t.name_vi }, currentLocale)).join(", ");
                      detailsDisplay.push(t('cart.toppings_label', { toppings: toppingNames }));
                    }
                    return (
                    <motion.div
                      key={item.uniqueId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" title={localizedItemName}>
                          {localizedItemName}
                        </p>
                        {detailsDisplay.length > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={detailsDisplay.join(" / ")}>
                            {detailsDisplay.join(" / ")}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("currency_format", { value: item.price / 100 })} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.uniqueId, item.qty - 1)}
                          className="h-6 w-6 p-0 rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[1.5rem] text-center">
                          {item.qty}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.uniqueId, item.qty + 1)}
                          className="h-6 w-6 p-0 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  )})}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Total:
                    </span>
                    <span className="font-bold text-lg" style={{ color: brandColor }}>
                      {t("currency_format", { value: total })}
                    </span>
                  </div>
                  <Button
                    onClick={onCheckout}
                    className="w-full text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brandColor }}
                  >
                    {t("cart.review_order_button")}
                    <ChevronRight className="h-4 w-4 ml-2" />
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
              borderColor: brandColor
            }}
            onClick={handleToggleExpanded}
          >
            <div className="p-3">
              <div className="flex items-center justify-between text-white">
                <button
                  onClick={handleToggleExpanded}
                  className="flex items-center space-x-3 flex-1 text-left"
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
                      {t("cart.items_in_cart_plural", { count })}
                    </p>
                    <p className="text-xs opacity-90">
                      {t("common.total")}: {t("currency_format", { value: total })}
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
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
