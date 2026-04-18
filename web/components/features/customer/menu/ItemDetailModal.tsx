"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Star, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { FoodItem, MenuItemSize, Topping } from "@/shared/types/menu";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  locale: string;
  brandColor: string;
  companyName?: string;
  branchName?: string;
  logoUrl?: string | null;
  onAddToCart: (
    item: FoodItem,
    quantity: number,
    selectedSize?: MenuItemSize,
    selectedToppings?: Topping[],
    notes?: string,
  ) => void;
  canAddItems?: boolean;
  initialQuantity?: number;
  initialSelectedSize?: MenuItemSize | null;
  initialSelectedToppings?: Topping[];
  initialNotes?: string;
  isEditMode?: boolean;
  showOrderNotes?: boolean;
}

export function ItemDetailModal({
  isOpen,
  onClose,
  item,
  locale,
  brandColor,
  companyName: _companyName,
  branchName: _branchName,
  logoUrl: _logoUrl,
  onAddToCart,
  canAddItems = true,
  initialQuantity = 1,
  initialSelectedSize = null,
  initialSelectedToppings = [],
  initialNotes = "",
  isEditMode = false,
  showOrderNotes = true,
}: ItemDetailModalProps) {
  const t = useTranslations("customer.menu.item_detail");

  // Portal mount guard (SSR safety)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep a stable snapshot of the item so exit animation can still render it
  // after the parent sets item → null at the same time as isOpen → false.
  const stableItemRef = useRef<FoodItem | null>(item);
  if (item) stableItemRef.current = item;
  const displayItem = isOpen ? item : stableItemRef.current;

  const sheetRef = useRef<HTMLDivElement>(null);

  // Customisation state
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(
    initialSelectedSize,
  );
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>(
    initialSelectedToppings,
  );
  const [notes, setNotes] = useState(initialNotes);
  const [isAdding, setIsAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Reset state every time a new item opens
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(initialQuantity);
      const defaultSize =
        initialSelectedSize ||
        item.menu_item_sizes?.[1] ||
        item.menu_item_sizes?.[0] ||
        null;
      setSelectedSize(defaultSize?.id ? defaultSize : null);
      setSelectedToppings([...initialSelectedToppings]);
      setNotes(initialNotes);
      setDescExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  // Focus sheet & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => sheetRef.current?.focus(), 80);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  // ── Derived values ────────────────────────────────────────────────────────
  const itemName = useMemo(() => {
    if (!displayItem) return "";
    return getLocalizedText(
      {
        name_en: displayItem.name_en,
        name_vi: displayItem.name_vi || "",
        name_ja: displayItem.name_ja || "",
      },
      locale,
    );
  }, [displayItem, locale]);

  const itemDescription = useMemo(() => {
    if (!displayItem) return "";
    return getLocalizedText(
      {
        en: displayItem.description_en || "",
        vi: displayItem.description_vi || "",
        ja: displayItem.description_ja || "",
      },
      locale,
    );
  }, [displayItem, locale]);

  const totalPrice = useMemo(() => {
    if (!displayItem) return 0;
    const base = selectedSize ? selectedSize.price : displayItem.price;
    const toppingSum = selectedToppings.reduce((s, tp) => s + tp.price, 0);
    return (base + toppingSum) * quantity;
  }, [displayItem, selectedSize, selectedToppings, quantity]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const decQty = useCallback(() => setQuantity((p) => Math.max(1, p - 1)), []);
  const incQty = useCallback(() => setQuantity((p) => p + 1), []);
  const selectSize = useCallback((s: MenuItemSize) => setSelectedSize(s), []);
  const toggleTopping = useCallback((tp: Topping) => {
    setSelectedToppings((prev) =>
      prev.some((t) => t.id === tp.id)
        ? prev.filter((t) => t.id !== tp.id)
        : [...prev, tp],
    );
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!displayItem || !canAddItems) return;
    setIsAdding(true);
    try {
      onAddToCart(
        displayItem,
        quantity,
        selectedSize || undefined,
        selectedToppings,
        notes,
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  }, [
    displayItem,
    quantity,
    selectedSize,
    selectedToppings,
    notes,
    onAddToCart,
    onClose,
    canAddItems,
  ]);

  // ── Early return ──────────────────────────────────────────────────────────
  if (!mounted) return null;

  const availableSizes = displayItem?.menu_item_sizes ?? [];
  const availableToppings = displayItem?.toppings ?? [];
  const DESC_LIMIT = 130;
  const isDescLong = itemDescription.length > DESC_LIMIT;

  return createPortal(
    <AnimatePresence>
      {isOpen && displayItem && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Bottom Sheet ── */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 340,
              mass: 0.9,
            }}
            className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col bg-white dark:bg-slate-900 rounded-t-[16px] focus:outline-none sm:left-1/2 sm:max-w-lg sm:w-full sm:-translate-x-1/2 sm:bottom-5 sm:rounded-2xl overflow-hidden"
            style={{ minHeight: "67dvh", maxHeight: "92dvh" }}
          >
            {/* ── Image ── */}
            <div className="relative w-full flex-shrink-0 h-[220px] sm:h-[300px]">
              {displayItem.image_url ? (
                <Image
                  src={displayItem.image_url}
                  alt={itemName}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20 flex items-center justify-center">
                  <span className="text-8xl opacity-40">🍽️</span>
                </div>
              )}
              {/* Rating pill */}
              {displayItem.averageRating && displayItem.averageRating > 0 && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/65 text-white px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {displayItem.averageRating.toFixed(1)}
                </div>
              )}

              {/* Unavailable overlay */}
              {!displayItem.available && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <Badge
                    variant="destructive"
                    className="text-sm px-4 py-2 font-semibold"
                  >
                    {t("currently_unavailable")}
                  </Badge>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/45 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-5 pt-3 pb-4 space-y-5">
                {/* Name + base price */}
                <div className="flex items-start justify-between gap-3">
                  <h1
                    id="item-modal-title"
                    className="text-xl font-bold text-slate-900 dark:text-white leading-snug flex-1"
                  >
                    {itemName}
                  </h1>
                  <span
                    className="text-xl font-bold flex-shrink-0 pt-0.5"
                    style={{ color: brandColor }}
                  >
                    ¥{selectedSize ? selectedSize.price : displayItem.price}
                  </span>
                </div>

                {/* Description */}
                {itemDescription.trim() && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed -mt-2">
                    {isDescLong && !descExpanded
                      ? `${itemDescription.slice(0, DESC_LIMIT).trimEnd()}…`
                      : itemDescription}
                    {isDescLong && (
                      <button
                        onClick={() => setDescExpanded((p) => !p)}
                        className="ml-1.5 text-xs font-medium underline-offset-2 hover:underline transition-colors"
                        style={{ color: brandColor }}
                      >
                        {descExpanded ? t("show_less") : t("show_more")}
                      </button>
                    )}
                  </p>
                )}

                {/* ── Size selector ── */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {t("choose_size")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes
                        .sort((a, b) => a.position - b.position)
                        .map((size) => {
                          const sizeName = getLocalizedText(
                            {
                              name_en: size.name_en,
                              name_vi: size.name_vi || "",
                              name_ja: size.name_ja || "",
                            },
                            locale,
                          );
                          const active = selectedSize?.id === size.id;
                          return (
                            <button
                              key={size.id}
                              onClick={() => selectSize(size)}
                              aria-pressed={active}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all"
                              style={{
                                borderColor: active ? brandColor : "#e2e8f0",
                                backgroundColor: active ? `${brandColor}15` : "transparent",
                                color: active ? brandColor : "#64748b",
                              }}
                            >
                              {sizeName}
                              <span
                                className="opacity-70"
                                style={{ color: active ? brandColor : "#94a3b8" }}
                              >
                                ¥{size.price}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ── Topping selector ── */}
                {availableToppings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {t("add_toppings")}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableToppings
                        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                        .map((topping) => {
                          const name = getLocalizedText(
                            {
                              name_en: topping.name_en,
                              name_vi: topping.name_vi || "",
                              name_ja: topping.name_ja || "",
                            },
                            locale,
                          );
                          const active = selectedToppings.some(
                            (t) => t.id === topping.id,
                          );
                          return (
                            <button
                              key={topping.id}
                              onClick={() => toggleTopping(topping)}
                              aria-pressed={active}
                              className="flex items-center gap-2 h-10 px-3 rounded-lg border text-left transition-all"
                              style={{
                                borderColor: active ? brandColor : "#e2e8f0",
                                backgroundColor: active ? `${brandColor}12` : "transparent",
                              }}
                            >
                              <span
                                className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  borderColor: active ? brandColor : "#cbd5e1",
                                  backgroundColor: active ? brandColor : "transparent",
                                }}
                              >
                                {active && (
                                  <Check
                                    className="h-2 w-2 text-white"
                                    strokeWidth={3.5}
                                  />
                                )}
                              </span>
                              <span className="flex-1 min-w-0 flex items-baseline justify-between gap-1">
                                <span className="text-xs text-slate-700 dark:text-slate-200 truncate">
                                  {name}
                                </span>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">
                                  +¥{topping.price}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ── Special Request ── */}
                {showOrderNotes && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {t("special_instructions")}
                    </p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("special_instructions_placeholder")}
                      className="min-h-[60px] resize-none rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus-visible:ring-1 placeholder:text-slate-400"
                      style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
                      maxLength={200}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Sticky footer: qty + CTA ── */}
            <div
              className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4"
              style={{
                paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Quantity stepper */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decQty}
                    disabled={quantity <= 1}
                    className="w-10 h-11 rounded-none hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
                    aria-label={t("decrease_quantity")}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-slate-900 dark:text-white text-base select-none">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={incQty}
                    className="w-10 h-11 rounded-none hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label={t("increase_quantity")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add-to-cart CTA */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddItems || !displayItem.available || isAdding}
                  className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-between px-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: brandColor }}
                  aria-label={`${isEditMode ? t("update") : t("add_to_cart")} — ¥${totalPrice}`}
                >
                  <div className="flex items-center gap-2">
                    {isAdding ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    <span>{isEditMode ? t("update") : t("add_to_cart")}</span>
                  </div>
                  <span className="bg-white/20 px-2.5 py-0.5 rounded-lg font-bold text-sm">
                    ¥{totalPrice}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
