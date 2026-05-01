"use client";

import { useState } from "react";
import {
  Check,
  Plus,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "framer-motion";
import { getLocalizedText, formatPrice } from "@/lib/customerUtils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { FoodItem } from "@/shared/types/menu";
import { cn } from "@/lib/utils";

interface CompactFoodCardProps {
  item: FoodItem;
  qtyInCart: number;
  onAdd: () => void;
  onCardClick: () => void;
  brandColor: string;
  locale: string;
  currency?: string;
  canAddItems?: boolean;
  showBadge?: boolean;
  showPopularBadge?: boolean;
  showRecommendedBadge?: boolean;
  priorityImage?: boolean;
}

export function CompactFoodCard({
  item,
  qtyInCart,
  onAdd,
  onCardClick,
  brandColor,
  locale,
  currency,
  canAddItems = true,
  showBadge = true,
  showPopularBadge = false,
  showRecommendedBadge = false,
  priorityImage = false,
}: CompactFoodCardProps) {
  const tMenu = useTranslations("customer.menu");
  const itemName = getLocalizedText(
    {
      name_en: item.name_en,
      name_vi: item.name_vi || "",
      name_ja: item.name_ja || "",
    },
    locale,
  );
  const sizeLabels = (item.menu_item_sizes || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((size) =>
      getLocalizedText(
        {
          name_en: size.name_en,
          name_vi: size.name_vi || "",
          name_ja: size.name_ja || "",
        },
        locale,
      ),
    )
    .filter(Boolean);
  const toppingLabels = (item.toppings || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((topping) =>
      getLocalizedText(
        {
          name_en: topping.name_en,
          name_vi: topping.name_vi || "",
          name_ja: topping.name_ja || "",
        },
        locale,
      ),
    )
    .filter(Boolean);
  const hasSizeOptions = sizeLabels.length >= 2;
  const visibleSizeLabels = hasSizeOptions ? sizeLabels.slice(0, 3) : [];
  const visibleToppingLabels = hasSizeOptions ? [] : toppingLabels.slice(0, 2);
  const hiddenToppingCount = hasSizeOptions
    ? toppingLabels.length
    : Math.max(toppingLabels.length - visibleToppingLabels.length, 0);
  const hasOptions =
    visibleSizeLabels.length > 0 ||
    visibleToppingLabels.length > 0 ||
    hiddenToppingCount > 0;
  const priceText = formatPrice(item.price, currency, locale);
  const toppingTypeLabel = tMenu("food_card.toppings");
  const hiddenToppingLabel = locale.startsWith("ja")
    ? `${toppingTypeLabel} +${hiddenToppingCount}`
    : `+${hiddenToppingCount} ${toppingTypeLabel}`;
  const isSoldOut =
    item.stock_level !== undefined &&
    item.stock_level !== null &&
    item.stock_level <= 0;
  const isOrderable = item.available && !isSoldOut;

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canAddItems || isAddingToCart || !isOrderable) return;

    if (
      (item.menu_item_sizes && item.menu_item_sizes.length > 0) ||
      (item.toppings && item.toppings.length > 0)
    ) {
      onCardClick();
      return;
    }

    setIsAddingToCart(true);
    onAdd();
    window.setTimeout(() => setIsAddingToCart(false), 520);
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative h-full rounded-[16px] text-left transition-transform duration-300",
        !isOrderable && "opacity-[0.72]",
      )}
      style={
        {
          "--menu-card-accent": brandColor,
        } as React.CSSProperties
      }
    >
      <div
        className="relative isolate overflow-hidden rounded-[16px] border border-[var(--co-menu-card-border)] bg-[var(--co-menu-card)] shadow-[var(--co-menu-card-shadow)]"
      >
        <div className="relative aspect-[1.18/1] w-full overflow-hidden bg-[var(--co-menu-subtle)]">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={itemName}
              fill
              className="object-cover brightness-[1.04] saturate-[1.04] transition duration-500 group-hover:scale-[1.025]"
              sizes="(max-width: 640px) 68vw, (max-width: 1280px) 264px, 292px"
              priority={priorityImage}
              loading={priorityImage ? undefined : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(233,163,94,0.26),transparent_32%),var(--co-menu-card)]">
              <UtensilsCrossed className="h-10 w-10 text-[var(--co-menu-card-muted)]" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(0,0,0,0.2)] to-transparent opacity-70" />
          <p
            className="pointer-events-none absolute right-3 top-3 z-20 grid h-9 min-w-[56px] place-items-center rounded-[12px] px-2.5 text-center text-[12px] font-semibold tabular-nums text-[var(--co-menu-price-text)] shadow-[0_12px_24px_-18px_rgba(31,26,20,0.72)] backdrop-blur-md"
            style={{
              backgroundColor: "var(--co-menu-price-bg)",
            }}
          >
            {priceText}
          </p>

          {showBadge && (showPopularBadge || showRecommendedBadge) ? (
            <div className="pointer-events-none absolute left-3 top-0 z-20 flex flex-wrap gap-1.5">
              {showPopularBadge ? (
                <span className="inline-flex h-8 items-start gap-1 bg-[var(--co-menu-hanko)] px-2.5 pt-1.5 text-[10px] font-semibold text-[var(--co-menu-hanko-text)] shadow-sm [clip-path:polygon(0_0,100%_0,100%_78%,58%_78%,50%_100%,42%_78%,0_78%)]">
                  <TrendingUp className="h-3 w-3" />
                  {tMenu("food_card.popular")}
                </span>
              ) : null}
              {showRecommendedBadge ? (
                <span className="inline-flex h-8 items-start gap-1 bg-[var(--co-menu-hanko)] px-2.5 pt-1.5 text-[10px] font-semibold text-[var(--co-menu-hanko-text)] shadow-sm [clip-path:polygon(0_0,100%_0,100%_78%,58%_78%,50%_100%,42%_78%,0_78%)]">
                  <Sparkles className="h-3 w-3" />
                  {tMenu("food_card.recommended")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCardClick}
          className="absolute inset-0 z-10 rounded-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--co-menu-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--co-menu-focus-offset)]"
          aria-label={`${tMenu("food_card.view_details")}: ${itemName}`}
        />

        <div className="pointer-events-none relative z-20 min-h-[100px] space-y-2 bg-[var(--co-menu-card-footer)] px-4 pb-4 pt-3 pr-12 md:px-4 md:pb-4 md:pr-12">
          <div className="min-w-0">
            <h3
              className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-tight text-[var(--co-menu-card-text)] sm:text-[15px] md:text-base"
              style={{ fontFamily: "var(--co-menu-display-font)" }}
            >
              {itemName}
            </h3>
          </div>

          {hasOptions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 pr-1 text-[var(--co-menu-card-muted)]">
              {visibleSizeLabels.map((label) => (
                <span
                  key={`size-${label}`}
                  className="grid h-5 min-w-7 place-items-center rounded-full bg-[var(--co-menu-subtle)] px-2 text-[9px] font-semibold text-[var(--co-menu-card-text)] backdrop-blur md:h-6 md:min-w-8 md:text-[10px]"
                >
                  {label}
                </span>
              ))}

              {visibleToppingLabels.map((label) => (
                <span
                  key={`topping-${label}`}
                  title={label}
                  className="grid h-5 max-w-[7.5rem] place-items-center truncate rounded-full bg-[var(--co-menu-subtle)] px-2 text-[9px] font-semibold text-[var(--co-menu-card-text)] backdrop-blur md:h-6 md:max-w-[8.5rem] md:text-[10px]"
                >
                  {label}
                </span>
              ))}

              {hiddenToppingCount > 0 ? (
                <span className="grid h-5 max-w-[7.5rem] place-items-center truncate rounded-full bg-[var(--co-menu-subtle)] px-2 text-[9px] font-semibold text-[var(--co-menu-card-text)] backdrop-blur md:h-6 md:max-w-[8.5rem] md:text-[10px]">
                  {hiddenToppingLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {qtyInCart > 0 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="pointer-events-none absolute left-3 top-3 z-[22] flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--co-menu-accent)] px-1.5 text-[10px] font-bold text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.55)]"
            style={{
              backgroundColor: "var(--co-menu-accent)",
            }}
          >
            {qtyInCart}
          </motion.div>
        ) : null}

        {canAddItems ? (
          <button
            type="button"
            onClick={handleAddClick}
            disabled={isAddingToCart || !isOrderable}
            className="absolute bottom-3 right-3 z-[22] grid h-9 w-9 place-items-center rounded-[12px] bg-[var(--co-menu-accent)] p-0 text-white shadow-[0_14px_28px_-18px_rgba(0,0,0,0.75)] transition-transform hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--co-menu-accent)",
            }}
            aria-label={`${tMenu("food_card.add_to_cart")} ${itemName}`}
          >
            {isAddingToCart ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[24] rounded-[16px]"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
        />

        {!isOrderable ? (
          <div
            className="absolute inset-0 z-[26] flex items-center justify-center"
            style={{ backgroundColor: "color-mix(in srgb, var(--co-menu-bg) 78%, transparent)" }}
          >
            <span className="rounded-full bg-[var(--co-menu-card)] px-3 py-1 text-xs font-semibold text-[var(--co-menu-card-text)]">
              {tMenu("food_card.out_of_stock")}
            </span>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
