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

  const resetItemScales = useCallback(() => {
    itemRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transform = 'scale(1)';
      el.style.zIndex = '';
    });
  }, []);

  const updateItemScales = useCallback(() => {
    // Scale effect only on mobile; on larger screens keep cards at natural size
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      resetItemScales();
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const fadeDistance = container.clientWidth * 0.55;

    itemRefs.current.forEach((el) => {
      if (!el) return;
      const itemCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(itemCenter - containerCenter);
      const progress = Math.max(0, 1 - distance / fadeDistance);
      // Subtle scale: 0.93 (edge) → 1.0 (center). Never above 1.0 so nothing looks inflated.
      const scale = 0.93 + 0.07 * progress;
      el.style.transform = `scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(Math.round(progress * 10));
    });
  }, [resetItemScales]);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateItemScales);
  }, [updateItemScales]);

  useEffect(() => {
    checkScrollability();
    updateItemScales();
    const container = scrollContainerRef.current;
    const handleResize = () => updateItemScales();
    window.addEventListener('resize', handleResize, { passive: true });
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
              style={{ willChange: 'transform', transition: 'transform 0.18s ease-out', flexShrink: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.04, 0.3),
                  duration: 0.25,
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
        
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <motion.div
              animate={{ x: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/80 dark:bg-slate-800/80 rounded-full p-1.5 shadow-md backdrop-blur-sm"
            >
              <ChevronRight className="h-3 w-3 text-slate-500 dark:text-slate-400 transform rotate-180" />
            </motion.div>
          </div>
        )}

        {/* Right scroll indicator */}
        {canScrollRight && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <motion.div
              animate={{ x: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/80 dark:bg-slate-800/80 rounded-full p-1.5 shadow-md backdrop-blur-sm"
            >
              <ChevronRight className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </motion.div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
