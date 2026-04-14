"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CompactFoodCard } from "./CompactFoodCard";
import { FoodItem } from "@/shared/types/menu";
// Enhanced interfaces for smart features
interface SmartMenuItem extends FoodItem {
  categoryId: string;
  categoryName: string;
  searchText: string;
  rating?: number;
  reviewCount?: number;
  isPopular?: boolean;
  isNew?: boolean;
  tags?: string[];
  contextScore?: number;
  estimatedPrepTime?: number;
  calories?: number;
  isRecommended?: boolean;
  recommendationReason?: string;
}

interface MenuSectionProps {
  title: string;
  description?: string;
  items: SmartMenuItem[];
  brandColor: string;
  locale: string;
  canAddItems: boolean;
  onItemClick: (item: SmartMenuItem) => void;
  onAddToCart: (item: SmartMenuItem) => void;
  getQuantity: (itemId: string) => number;
  showPopularBadge?: boolean;
  showRecommendedBadge?: boolean;
  icon?: React.ReactNode;
}

export function MenuSection({
  title,
  description,
  items,
  brandColor,
  locale,
  canAddItems,
  onItemClick,
  onAddToCart,
  getQuantity,
  showPopularBadge = false,
  showRecommendedBadge = false,
  icon,
}: MenuSectionProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const updateItemScales = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const fadeDistance = container.clientWidth * 0.52;

    itemRefs.current.forEach((el) => {
      if (!el) return;
      const itemCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(itemCenter - containerCenter);
      const progress = Math.max(0, 1 - distance / fadeDistance);
      // Ease in-out: quadratic gives a natural center "pop"
      const eased = progress * (2 - progress);
      const scale = 0.9 + 0.24 * eased; // 0.88 → 1.12
      el.style.transform = `scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(Math.round(eased * 10));
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateItemScales);
  }, [updateItemScales]);

  useEffect(() => {
    checkScrollability();
    updateItemScales();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        container.removeEventListener('scroll', handleScroll);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [items, handleScroll, updateItemScales]);

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Enhanced Section Header with better visual hierarchy */}
      <div className="flex items-center gap-3 px-4">
        {icon && (
          <div 
            className="p-2 rounded-lg bg-gradient-to-br opacity-90"
            style={{ 
              background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`,
              color: brandColor 
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          {items.length} items
        </div>
      </div>

      {/* Enhanced Horizontal Scrolling Items with better indicators */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto py-4 px-4 scrollbar-hide scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              style={{ willChange: 'transform', transition: 'transform 0.12s ease-out', flexShrink: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              >
                <CompactFoodCard
                  item={item}
                  qtyInCart={getQuantity(item.id)}
                  onAdd={() => onAddToCart(item)}
                  onCardClick={() => onItemClick(item)}
                  brandColor={brandColor}
                  locale={locale}
                  canAddItems={canAddItems}
                  showPopularBadge={showPopularBadge}
                  showRecommendedBadge={showRecommendedBadge}
                />
              </motion.div>
            </div>
          ))}
        </div>
        
        {/* Enhanced left scroll indicator with better visibility */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-white via-white/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent pointer-events-none flex items-center justify-start pl-3 z-10">
            <motion.div
              animate={{ x: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/80 dark:bg-slate-800/80 rounded-full p-1.5 shadow-md backdrop-blur-sm"
            >
              <ChevronRight className="h-3 w-3 text-slate-500 dark:text-slate-400 transform rotate-180" />
            </motion.div>
          </div>
        )}
        
        {/* Enhanced right scroll indicator with better visibility and hint */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-white via-white/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent pointer-events-none flex items-center justify-end pr-3 z-10">
            <motion.div
              animate={{ x: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/80 dark:bg-slate-800/80 rounded-full p-1.5 shadow-md backdrop-blur-sm"
            >
              <ChevronRight className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </motion.div>
            {/* Subtle "more items" hint */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -top-6 right-2 text-xs text-slate-400 dark:text-slate-500 bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-full backdrop-blur-sm"
            >
              +{items.length - 3}
            </motion.div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
