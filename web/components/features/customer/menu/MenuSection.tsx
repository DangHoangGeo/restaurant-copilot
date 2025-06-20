"use client";

import { motion } from "framer-motion";
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
  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 px-4">
        {icon && <div style={{ color: brandColor }}>{icon}</div>}
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Horizontal Scrolling Items */}
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
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
    </motion.section>
  );
}
