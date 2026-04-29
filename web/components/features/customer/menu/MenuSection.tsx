"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompactFoodCard } from "./CompactFoodCard";
import { FoodItem } from "@/shared/types/menu";
import { useTranslations } from "next-intl";

interface SmartMenuItem extends FoodItem {
  categoryId: string;
  categoryName: string;
  searchText: string;
  tags?: string[];
  isRecommended?: boolean;
  recommendationReason?: string;
}

interface MenuSectionProps {
  title: string;
  description?: string;
  items: SmartMenuItem[];
  brandColor: string;
  locale: string;
  currency?: string;
  canAddItems: boolean;
  onItemClick: (item: SmartMenuItem) => void;
  onAddToCart: (item: SmartMenuItem) => void;
  getQuantity: (itemId: string) => number;
  showPopularBadge?: boolean;
  showRecommendedBadge?: boolean;
  icon?: React.ReactNode;
  sectionId?: string;
  eagerImages?: boolean;
}

export function MenuSection({
  title,
  items,
  brandColor,
  locale,
  currency,
  canAddItems,
  onItemClick,
  onAddToCart,
  getQuantity,
  showPopularBadge = false,
  showRecommendedBadge = false,
  icon,
  sectionId,
  eagerImages = false,
}: MenuSectionProps) {
  const tMenu = useTranslations("customer.menu");
  const scrollRef = useRef<HTMLDivElement>(null);
  const canScroll = items.length > 1;

  if (items.length === 0) return null;

  const handleScroll = (direction: "previous" | "next") => {
    scrollRef.current?.scrollBy({
      left: direction === "previous" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <motion.section
      id={sectionId}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="w-full scroll-mt-32 space-y-3 md:scroll-mt-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-[var(--co-menu-subtle)] text-[var(--co-menu-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                {icon}
              </div>
            ) : null}
            <h2
              className="text-[1.45rem] font-semibold leading-[1.04] text-[var(--co-menu-text)] sm:text-[1.7rem] md:text-[2rem]"
              style={{ fontFamily: "var(--co-menu-display-font)" }}
            >
              {title}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 items-center rounded-[12px] bg-[var(--co-menu-count-bg)] px-3 text-[11px] font-medium text-[var(--co-menu-count-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {tMenu("item_count", { count: items.length })}
          </div>
          {canScroll ? (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => handleScroll("previous")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--co-menu-chip)] text-[var(--co-menu-text)] transition-colors hover:bg-[var(--co-menu-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--co-menu-accent)]"
                aria-label={tMenu("scroll_previous")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("next")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--co-menu-chip)] text-[var(--co-menu-text)] transition-colors hover:bg-[var(--co-menu-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--co-menu-accent)]"
                aria-label={tMenu("scroll_next")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide md:gap-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-1 xl:grid-cols-5"
      >
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: Math.min(index * 0.035, 0.24),
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-[68vw] min-w-[220px] max-w-[286px] shrink-0 snap-start sm:w-[252px] sm:max-w-[270px] md:w-[264px] md:max-w-[286px] lg:w-auto lg:min-w-0 lg:max-w-none"
          >
            <CompactFoodCard
              item={item}
              qtyInCart={getQuantity(item.id)}
              onAdd={() => onAddToCart(item)}
              onCardClick={() => onItemClick(item)}
              brandColor={brandColor}
              locale={locale}
              currency={currency}
              canAddItems={canAddItems}
              showPopularBadge={showPopularBadge}
              showRecommendedBadge={showRecommendedBadge}
              priorityImage={eagerImages && index < 2}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
