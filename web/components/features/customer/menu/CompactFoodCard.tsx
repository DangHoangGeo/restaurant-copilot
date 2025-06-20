"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { getLocalizedText } from "@/lib/customerUtils";
import Image from "next/image";
import type { FoodItem } from "../FoodCard";

// Helper function to get appropriate food emoji based on item name
const getFoodEmoji = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  // Specific food mappings
  if (name.includes('pizza')) return '🍕';
  if (name.includes('burger') || name.includes('hamburger')) return '🍔';
  if (name.includes('sushi') || name.includes('roll')) return '🍣';
  if (name.includes('ramen') || name.includes('noodle')) return '🍜';
  if (name.includes('rice') || name.includes('fried rice')) return '🍚';
  if (name.includes('pasta') || name.includes('spaghetti')) return '🍝';
  if (name.includes('taco')) return '🌮';
  if (name.includes('sandwich') || name.includes('sub')) return '🥪';
  if (name.includes('salad')) return '🥗';
  if (name.includes('soup')) return '🍲';
  if (name.includes('chicken') || name.includes('poultry')) return '🍗';
  if (name.includes('beef') || name.includes('steak')) return '🥩';
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return '🐟';
  if (name.includes('coffee') || name.includes('espresso')) return '☕';
  if (name.includes('tea')) return '🍵';
  if (name.includes('cake') || name.includes('dessert')) return '🍰';
  if (name.includes('ice cream') || name.includes('gelato')) return '🍦';
  if (name.includes('bread') || name.includes('toast')) return '🍞';
  if (name.includes('egg')) return '🥚';
  if (name.includes('fruit') || name.includes('apple') || name.includes('orange')) return '🍎';
  if (name.includes('vegetable') || name.includes('veggie')) return '🥬';
  if (name.includes('cheese')) return '🧀';
  if (name.includes('wine')) return '🍷';
  if (name.includes('beer')) return '🍺';
  if (name.includes('cocktail') || name.includes('drink')) return '🍹';
  
  // Category-based fallbacks
  if (name.includes('breakfast') || name.includes('morning')) return '🌅';
  if (name.includes('lunch')) return '🍽️';
  if (name.includes('dinner')) return '🌙';
  if (name.includes('snack')) return '🥨';
  if (name.includes('appetizer') || name.includes('starter')) return '🥟';
  if (name.includes('main') || name.includes('entree')) return '🍽️';
  if (name.includes('side')) return '🥄';
  if (name.includes('hot') || name.includes('spicy')) return '🌶️';
  if (name.includes('cold') || name.includes('iced')) return '🧊';
  if (name.includes('fresh')) return '🌿';
  if (name.includes('grilled') || name.includes('bbq')) return '🔥';
  
  // Default food emoji
  return '🍽️';
};

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
      whileHover={{ 
        scale: 1.03, 
        y: -2,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        duration: 0.2
      }}
      className="w-[150px] h-[200px] rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 flex flex-col"
      onClick={onCardClick}
    >
      {/* Image Container - Perfect aspect ratio 4:3 with loading state */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">
        {item.image_url && (
          <Image
            src={item.image_url}
            alt={itemName}
            fill
            className="object-cover aspect-[4/3] transition-opacity duration-300"
            loading="lazy"
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '1';
            }}
            onError={(e) => {
              // Fallback to colored background with first letter if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            style={{ opacity: 0 }}
          />
        )}
        
        {/* Use placeholder SVG when no image_url */}
        {!item.image_url && (
          <Image
            src="/placeholder-food.svg"
            alt={itemName}
            fill
            className="object-cover aspect-[4/3]"
          />
        )}
        
        {/* Enhanced fallback for missing images with food emojis and better centering */}
        {!item.image_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-yellow-900/30 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="text-center"
            >
              <span className="text-3xl mb-2 block">
                {getFoodEmoji(itemName)}
              </span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide bg-white/20 px-2 py-1 rounded-full">
                {itemName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          </div>
        )}
        
        {/* Enhanced Floating Add Button with better touch feedback */}
        {canAddItems && (
          <motion.div
            animate={isAddingToCart ? { 
              scale: [1, 1.2, 1], 
              rotate: [0, 180, 360] 
            } : { 
              scale: 1, 
              rotate: 0 
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ 
              duration: isAddingToCart ? 0.6 : 0.2,
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
            className="absolute bottom-2 right-2"
          >
            <Button
              size="sm"
              onClick={handleAddClick}
              disabled={isAddingToCart}
              className="h-8 w-8 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white/20"
              style={{ 
                backgroundColor: isAddingToCart ? '#10b981' : brandColor,
                boxShadow: isAddingToCart 
                  ? '0 0 20px rgba(16, 185, 129, 0.4)' 
                  : `0 4px 12px ${brandColor}33`
              }}
              aria-label={`Add ${itemName} to cart`}
            >
              <motion.div
                animate={isAddingToCart ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-4 w-4 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={isAddingToCart ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="absolute inset-0 flex items-center justify-center text-white font-bold"
              >
                ✓
              </motion.div>
            </Button>
          </motion.div>
        )}

        {/* Enhanced Badge Overlay with better styling */}
        {showBadge && (showPopularBadge || showRecommendedBadge) && (
          <div className="absolute top-2 left-2 z-10">
            {showPopularBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs flex items-center gap-1 px-2 py-1 shadow-lg border-0">
                  <TrendingUp className="h-3 w-3" />
                  Popular
                </Badge>
              </motion.div>
            )}
            {showRecommendedBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs flex items-center gap-1 px-2 py-1 shadow-lg border-0">
                  <Sparkles className="h-3 w-3" />
                  AI Pick
                </Badge>
              </motion.div>
            )}
          </div>
        )}

        {/* Enhanced Quantity Indicator with better styling */}
        {qtyInCart > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-10"
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

      {/* Enhanced Content - Better price alignment and spacing */}
      <div className="flex-1 p-3 flex flex-col justify-between min-h-0">
        <div className="space-y-2">
          <div 
            className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-200 line-clamp-2 overflow-hidden"
            title={itemName}
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.3em',
              maxHeight: '2.6em'
            }}
          >
            {itemName}
          </div>
        </div>
        <div className="mt-auto pt-1">
          <div className="font-bold text-base text-right" style={{ color: brandColor }}>
            ¥{item.price}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
