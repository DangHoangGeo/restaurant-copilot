"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { getLocalizedText } from "@/lib/customerUtils";
import Image from "next/image";
import type { FoodItem } from "../FoodCard";

interface CompactFoodCardProps {
  item: FoodItem;
  qtyInCart: number;
  onAdd: () => void;
  onCardClick: () => void;
  brandColor: string;
  locale: string;
  canAddItems?: boolean;
  showBadge?: boolean;
  showPopularBadge?: boolean;
  showRecommendedBadge?: boolean;
}

export function CompactFoodCard({
  item,
  qtyInCart,
  onAdd,
  onCardClick,
  brandColor,
  locale,
  canAddItems = true,
  showBadge = true,
  showPopularBadge = false,
  showRecommendedBadge = false,
}: CompactFoodCardProps) {
  const itemName = getLocalizedText(
    { name_en: item.name_en, name_vi: item.name_vi || '', name_ja: item.name_ja || '' },
    locale,
  );

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAddItems || isAddingToCart) return;
    
    // If item has sizes or toppings, open detail view instead of adding directly
    if ((item.menu_item_sizes && item.menu_item_sizes.length > 0) || 
        (item.toppings && item.toppings.length > 0)) {
      onCardClick();
      return;
    }
    
    // Animate the add button
    setIsAddingToCart(true);
    onAdd();
    setTimeout(() => setIsAddingToCart(false), 600);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-[140px] h-[180px] rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 cursor-pointer transition-all hover:shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col"
      onClick={onCardClick}
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className="relative w-full h-[90px] overflow-hidden bg-slate-100 dark:bg-slate-700">
        <Image
          src={item.image_url || "/placeholder-food.png"}
          alt={itemName}
          fill
          className="object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback to colored background with first letter if image fails
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        
        {/* Fallback for missing images */}
        {!item.image_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">
              {itemName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Floating Add Button with animation */}
        {canAddItems && (
          <motion.div
            animate={isAddingToCart ? { scale: [1, 1.3, 1], rotate: [0, 180, 360] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-2 right-2"
          >
            <Button
              size="sm"
              onClick={handleAddClick}
              disabled={isAddingToCart}
              className="h-7 w-7 rounded-full p-0 shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: isAddingToCart ? '#10b981' : brandColor }}
              aria-label={`Add ${itemName} to cart`}
            >
              <motion.div
                animate={isAddingToCart ? { scale: 0 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-3.5 w-3.5 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={isAddingToCart ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                ✓
              </motion.div>
            </Button>
          </motion.div>
        )}

        {/* Badge Overlay - Fixed position */}
        {showBadge && (showPopularBadge || showRecommendedBadge) && (
          <div className="absolute top-2 left-2">
            {showPopularBadge && (
              <Badge className="bg-orange-500 text-white text-xs flex items-center gap-1 px-1.5 py-0.5 shadow-sm">
                <TrendingUp className="h-2.5 w-2.5" />
                Popular
              </Badge>
            )}
            {showRecommendedBadge && (
              <Badge className="bg-purple-500 text-white text-xs flex items-center gap-1 px-1.5 py-0.5 shadow-sm">
                <Sparkles className="h-2.5 w-2.5" />
                AI Pick
              </Badge>
            )}
          </div>
        )}

        {/* Quantity Indicator - Fixed position */}
        {qtyInCart > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm"
          >
            {qtyInCart}
          </motion.div>
        )}

        {/* Availability overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content - Fixed height with proper text truncation */}
      <div className="flex-1 p-3 flex flex-col justify-between min-h-0">
        <div className="space-y-1">
          <div 
            className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-200 line-clamp-2 overflow-hidden"
            title={itemName}
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.2em',
              maxHeight: '2.4em'
            }}
          >
            {itemName}
          </div>
          <div className="font-bold text-sm truncate" style={{ color: brandColor }}>
            ¥{item.price}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
