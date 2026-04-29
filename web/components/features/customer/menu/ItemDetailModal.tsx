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
import {
  X,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Check,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getLocalizedText, formatPrice } from "@/lib/customerUtils";
import type { FoodItem, MenuItemSize, Topping } from "@/shared/types/menu";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  locale: string;
  brandColor: string;
  currency?: string;
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
  currency,
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
  const tCommon = useTranslations("common");

  const fp = (amount: number) => formatPrice(amount, currency, locale);

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

  // Reset state every time a new item opens
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(initialQuantity);
      const defaultSize =
        initialSelectedSize ||
        item.menu_item_sizes?.[0] ||
        null;
      setSelectedSize(defaultSize?.id ? defaultSize : null);
      setSelectedToppings([...initialSelectedToppings]);
      setNotes(initialNotes);
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
        name_en: displayItem.description_en || "",
        name_vi: displayItem.description_vi || "",
        name_ja: displayItem.description_ja || "",
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
            className="fixed inset-0 z-[9998] bg-black/72 backdrop-blur-[2px]"
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
            className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col overflow-hidden rounded-t-[24px] border text-[var(--co-menu-card-text)] shadow-[0_30px_100px_-50px_rgba(0,0,0,0.72)] backdrop-blur-xl focus:outline-none sm:bottom-5 sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:rounded-[24px] md:max-w-3xl"
            style={{
              minHeight: "67dvh",
              maxHeight: "92dvh",
              background: "var(--co-menu-card)",
              borderColor: "var(--co-menu-card-border)",
            }}
          >
            {/* ── Image ── */}
            <div className="relative aspect-[4/3] max-h-[42dvh] min-h-[220px] w-full flex-shrink-0 overflow-hidden rounded-t-[inherit] bg-[var(--co-menu-card-footer)] sm:aspect-video sm:min-h-0">
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
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--co-menu-subtle)]">
                  <UtensilsCrossed className="h-16 w-16 text-[var(--co-menu-card-muted)]" />
                </div>
              )}
              {/* Rating pill */}
              {displayItem.averageRating && displayItem.averageRating > 0 && (
                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[var(--co-menu-price-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--co-menu-price-text)] backdrop-blur-xl">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {displayItem.averageRating.toFixed(1)}
                </div>
              )}

              {/* Unavailable overlay */}
              {!displayItem.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(20,12,8,0.72)]">
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
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--co-menu-price-bg)] text-[var(--co-menu-price-text)] backdrop-blur-xl transition-colors hover:brightness-110"
                aria-label={tCommon("close_modal")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-5 px-5 pb-4 pt-4">
                {/* Name + base price */}
                <div className="flex items-start justify-between gap-3">
                  <h1
                    id="item-modal-title"
                    className="flex-1 text-xl font-semibold leading-snug text-[var(--co-menu-card-text)]"
                    style={{ fontFamily: "var(--co-menu-display-font)" }}
                  >
                    {itemName}
                  </h1>
                  <span className="flex-shrink-0 pt-0.5 text-xl font-semibold tabular-nums text-[var(--co-menu-accent-strong)]">
                    {fp(selectedSize ? selectedSize.price : displayItem.price)}
                  </span>
                </div>

                {itemDescription ? (
                  <p className="max-w-prose text-sm leading-6 text-[var(--co-menu-card-muted)]">
                    {itemDescription}
                  </p>
                ) : null}

                {/* ── Size selector ── */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--co-menu-card-muted)]">
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
                              className={
                                active
                                  ? "inline-flex min-h-11 items-center gap-1.5 rounded-[14px] border border-[var(--co-menu-accent)] bg-[var(--co-menu-accent)] px-4 py-2 text-xs font-medium text-white transition-all"
                                  : "inline-flex min-h-11 items-center gap-1.5 rounded-[14px] border border-[var(--co-menu-card-border)] bg-[var(--co-menu-subtle)] px-4 py-2 text-xs font-medium text-[var(--co-menu-card-text)] transition-all hover:brightness-105"
                              }
                            >
                              {sizeName}
                              <span className="opacity-70">
                                {fp(size.price)}
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--co-menu-card-muted)]">
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
                              className={
                                active
                                  ? "flex h-11 items-center gap-2 rounded-[14px] border border-[var(--co-menu-accent)] bg-[var(--co-menu-accent)] px-3 text-left text-white transition-all"
                                  : "flex h-11 items-center gap-2 rounded-[14px] border border-[var(--co-menu-card-border)] bg-[var(--co-menu-subtle)] px-3 text-left transition-all hover:brightness-105"
                              }
                            >
                              <span
                                className={
                                  active
                                    ? "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/25 transition-all"
                                    : "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-[var(--co-menu-card-muted)] bg-transparent transition-all"
                                }
                              >
                                {active && (
                                  <Check
                                    className="h-2 w-2 text-white"
                                    strokeWidth={3.5}
                                  />
                                )}
                              </span>
                              <span className="flex-1 min-w-0 flex items-baseline justify-between gap-1">
                                <span className="truncate text-xs text-[var(--co-menu-card-text)]">
                                  {name}
                                </span>
                                <span className="flex-shrink-0 text-[10px] text-[var(--co-menu-card-muted)]">
                                  +{fp(topping.price)}
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--co-menu-card-muted)]">
                      {t("special_instructions")}
                    </p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("special_instructions_placeholder")}
                      className="min-h-[60px] resize-none rounded-2xl border-0 bg-[var(--co-menu-subtle)] text-xs text-[var(--co-menu-card-text)] placeholder:text-[var(--co-menu-card-muted)] focus-visible:ring-1"
                      style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
                      maxLength={200}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Sticky footer: qty + CTA ── */}
            <div
              className="flex-shrink-0 px-5 py-4 shadow-[0_-18px_45px_-34px_rgba(0,0,0,0.42)] backdrop-blur-xl"
              style={{
                paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
                background: "var(--co-menu-card)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Quantity stepper */}
                <div className="flex flex-shrink-0 items-center overflow-hidden rounded-2xl bg-[var(--co-menu-subtle)]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decQty}
                    disabled={quantity <= 1}
                    className="h-11 w-10 rounded-none text-[var(--co-menu-card-text)] hover:bg-[var(--co-menu-subtle)] disabled:opacity-40"
                    aria-label={t("decrease_quantity")}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 select-none text-center text-base font-bold text-[var(--co-menu-card-text)]">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={incQty}
                    className="h-11 w-10 rounded-none text-[var(--co-menu-card-text)] hover:bg-[var(--co-menu-subtle)]"
                    aria-label={t("increase_quantity")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add-to-cart CTA */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddItems || !displayItem.available || isAdding}
                  className="flex h-11 flex-1 items-center justify-between rounded-2xl px-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: brandColor }}
                  aria-label={`${isEditMode ? t("update") : t("add_to_cart")} — ${fp(totalPrice)}`}
                >
                  <div className="flex items-center gap-2">
                    {isAdding ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    <span className="whitespace-nowrap">
                      {isEditMode ? t("update") : t("add_to_cart")}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white/20 px-2.5 py-0.5 text-sm font-bold">
                    {fp(totalPrice)}
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
