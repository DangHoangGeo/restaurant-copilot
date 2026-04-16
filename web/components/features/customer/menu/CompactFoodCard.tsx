"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { getLocalizedText } from "@/lib/customerUtils";
import Image from "next/image";
import { FoodItem } from "@/shared/types/menu";

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

// Helper function to get category-based pastel background colors
const getCategoryPastelColor = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  // Food type based colors
  if (name.includes('coffee') || name.includes('tea') || name.includes('drink')) {
    return 'from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-900/20 dark:via-yellow-900/10 dark:to-orange-900/20';
  }
  if (name.includes('pizza') || name.includes('pasta') || name.includes('bread')) {
    return 'from-red-100 via-orange-50 to-yellow-100 dark:from-red-900/20 dark:via-orange-900/10 dark:to-yellow-900/20';
  }
  if (name.includes('sushi') || name.includes('fish') || name.includes('seafood')) {
    return 'from-blue-100 via-cyan-50 to-teal-100 dark:from-blue-900/20 dark:via-cyan-900/10 dark:to-teal-900/20';
  }
  if (name.includes('salad') || name.includes('vegetable') || name.includes('green')) {
    return 'from-green-100 via-emerald-50 to-lime-100 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-lime-900/20';
  }
  if (name.includes('cake') || name.includes('dessert') || name.includes('ice cream')) {
    return 'from-pink-100 via-rose-50 to-purple-100 dark:from-pink-900/20 dark:via-rose-900/10 dark:to-purple-900/20';
  }
  if (name.includes('meat') || name.includes('beef') || name.includes('chicken')) {
    return 'from-orange-100 via-red-50 to-pink-100 dark:from-orange-900/20 dark:via-red-900/10 dark:to-pink-900/20';
  }
  
  // Default warm pastel
  return 'from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-yellow-900/30';
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
        
        {/* Enhanced fallback for missing images with category-based colors and better centering */}
        {!item.image_url && (
          <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryPastelColor(itemName)} flex flex-col items-center justify-center`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="text-center flex flex-col items-center justify-center h-full"
            >
              <motion.span 
                className="text-4xl mb-3 block"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {getFoodEmoji(itemName)}
              </motion.span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-white/30 dark:bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                {itemName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          </div>
        )}
        


        {/* Minimal Badge Overlay - positioned to barely cover image */}
        {showBadge && (showPopularBadge || showRecommendedBadge) && (
          <div className="absolute top-1 left-1 z-10">
            {showPopularBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] flex items-center gap-0.5 px-1 py-0.5 shadow-md border-0 rounded-sm">
                  <TrendingUp className="h-2 w-2" />
                  <span className="hidden sm:inline">Popular</span>
                  <span className="sm:hidden">🔥</span>
                </Badge>
              </motion.div>
            )}
            {showRecommendedBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] flex items-center gap-0.5 px-1 py-0.5 shadow-md border-0 rounded-sm">
                  <Sparkles className="h-2 w-2" />
                  <span className="hidden sm:inline">AI Pick</span>
                  <span className="sm:hidden">✨</span>
                </Badge>
              </motion.div>
            )}
          </div>
        )}

        {/* Minimal Quantity Indicator - positioned outside image */}
        {qtyInCart > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute top-1 right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md border border-white z-10"
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
            className="font-semibold text-xs sm:text-sm leading-tight text-slate-800 dark:text-slate-200 line-clamp-2 overflow-hidden"
            title={itemName}
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.3em',
              maxHeight: '2.6em',
              wordBreak: 'break-word'
            }}
          >
            {itemName}
          </div>
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between">
          <div className="font-bold text-base" style={{ color: brandColor }}>
            ¥{item.price}
          </div>
          {/* Enhanced Add Button with enhanced animations and accessibility */}
          {canAddItems && (
            <motion.div
              animate={isAddingToCart ? { 
                scale: [1, 1.15, 1.05, 1], 
                rotate: [0, 15, -15, 0] 
              } : { 
                scale: 1, 
                rotate: 0 
              }}
              whileHover={{ 
                scale: 1.1,
                boxShadow: `0 8px 25px ${brandColor}40`
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
              transition={{ 
                duration: isAddingToCart ? 0.8 : 0.2,
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
            >
              <Button
                size="sm"
                onClick={handleAddClick}
                disabled={isAddingToCart}
                className="h-7 w-7 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white/20 focus:ring-2 focus:ring-offset-2 relative overflow-hidden"
                style={{ 
                  backgroundColor: isAddingToCart ? '#10b981' : brandColor,
                  boxShadow: isAddingToCart 
                    ? '0 0 25px rgba(16, 185, 129, 0.5)' 
                    : `0 4px 15px ${brandColor}40`
                }}
                aria-label={`Add ${itemName} to cart`}
              >
                {/* Success ripple effect */}
                {isAddingToCart && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 rounded-full bg-white"
                  />
                )}
                
                <motion.div
                  animate={isAddingToCart ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="h-4 w-4 text-white" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isAddingToCart ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm"
                >
                  ✓
                </motion.div>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
