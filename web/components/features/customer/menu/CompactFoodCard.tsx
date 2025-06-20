"use client";

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

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAddItems) return;
    
    // If item has sizes or toppings, open detail view instead of adding directly
    if ((item.menu_item_sizes && item.menu_item_sizes.length > 0) || 
        (item.toppings && item.toppings.length > 0)) {
      onCardClick();
      return;
    }
    
    onAdd();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="min-w-[130px] max-w-[160px] rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 cursor-pointer transition-all hover:shadow-lg border border-slate-200 dark:border-slate-700"
      onClick={onCardClick}
    >
      {/* Image Container */}
      <div className="relative">
        <Image
          src={item.image_url || "/placeholder-food.png"}
          alt={itemName}
          width={160}
          height={96}
          className="w-full h-24 object-cover"
          loading="lazy"
        />
        
        {/* Floating Add Button */}
        {canAddItems && (
          <Button
            size="sm"
            onClick={handleAddClick}
            className="absolute bottom-2 right-2 h-7 w-7 rounded-full p-0 shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: brandColor }}
          >
            <Plus className="h-3.5 w-3.5 text-white" />
          </Button>
        )}

        {/* Badge Overlay */}
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

        {/* Quantity Indicator */}
        {qtyInCart > 0 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm">
            {qtyInCart}
          </div>
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

      {/* Content */}
      <div className="p-3 space-y-1">
        <div className="font-semibold text-sm line-clamp-2 leading-tight text-slate-800 dark:text-slate-200" title={itemName}>
          {itemName}
        </div>
        <div className="font-bold text-sm" style={{ color: brandColor }}>
          ¥{item.price}
        </div>
        
        {/* Additional info for items with customization */}
        {((item.menu_item_sizes && item.menu_item_sizes.length > 0) ||
          (item.toppings && item.toppings.length > 0)) && (
          <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">
            + Options
          </div>
        )}
      </div>
    </motion.div>
  );
}
