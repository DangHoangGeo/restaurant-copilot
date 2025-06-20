"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CompactFoodCard } from "./CompactFoodCard";
import type { FoodItem } from "../FoodCard";

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

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      return () => container.removeEventListener('scroll', checkScrollability);
    }
  }, [items]);

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
          className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item, index) => (
            <motion.div
              key={item.id}
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
          ))}
        </div>
        
        {/* Enhanced left scroll indicator with fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-white via-white/80 dark:from-slate-900 dark:via-slate-900/80 to-transparent pointer-events-none flex items-center justify-start pl-2">
            <motion.div
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronRight className="h-4 w-4 text-slate-400 transform rotate-180" />
            </motion.div>
          </div>
        )}
        
        {/* Enhanced right scroll indicator with fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white via-white/80 dark:from-slate-900 dark:via-slate-900/80 to-transparent pointer-events-none flex items-center justify-end pr-2">
            <motion.div
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </motion.div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
