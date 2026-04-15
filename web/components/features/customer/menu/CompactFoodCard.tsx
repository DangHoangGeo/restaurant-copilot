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
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.2
      }}
      className="relative w-[180px] h-[240px] md:w-[280px] md:h-[380px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shadow-md flex-shrink-0 cursor-pointer"
      onClick={onCardClick}
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={itemName}
            fill
            className="object-cover transition-opacity duration-300"
            loading="lazy"
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '1';
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            style={{ opacity: 0 }}
          />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryPastelColor(itemName)}`} />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-5xl md:text-7xl">{getFoodEmoji(itemName)}</span>
            </motion.div>
          </>
        )}
      </div>

      {/* Bottom gradient — seamlessly blends image into the info area */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Badges — top left */}
      {showBadge && (showPopularBadge || showRecommendedBadge) && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {showPopularBadge && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 shadow-md border-0 rounded-sm">
                <TrendingUp className="h-2 w-2" />
                <span>Popular</span>
              </Badge>
            </motion.div>
          )}
          {showRecommendedBadge && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 shadow-md border-0 rounded-sm">
                <Sparkles className="h-2 w-2" />
                <span>AI Pick</span>
              </Badge>
            </motion.div>
          )}
        </div>
      )}

      {/* Quantity indicator — top right */}
      {qtyInCart > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute top-2 right-2 text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-[10px] md:text-xs font-bold shadow-md border-2 border-white z-10"
          style={{ backgroundColor: brandColor }}
        >
          {qtyInCart}
        </motion.div>
      )}

      {/* Availability overlay */}
      {!item.available && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Out of Stock
          </span>
        </div>
      )}

      {/* Info overlay — sits on top of the gradient at the bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3 md:p-5 flex flex-col gap-1 md:gap-2">
        <div
          className="font-semibold text-sm md:text-lg leading-tight text-white line-clamp-2"
          title={itemName}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {itemName}
        </div>
        <div className="flex items-center justify-between">
          <div className="font-bold text-base md:text-xl text-white drop-shadow" style={{ color: brandColor }}>
            ¥{item.price}
          </div>
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
              transition={isAddingToCart ? {
                duration: 0.5,
                type: "tween",
                ease: "easeInOut",
              } : {
                duration: 0.2,
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <Button
                size="sm"
                onClick={handleAddClick}
                disabled={isAddingToCart}
                className="h-8 w-8 md:h-11 md:w-11 rounded-full p-0 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white/20 focus:ring-2 focus:ring-offset-2 relative overflow-hidden"
                style={{
                  backgroundColor: brandColor,
                  boxShadow: isAddingToCart
                    ? `0 0 25px ${brandColor}80`
                    : `0 4px 15px ${brandColor}40`
                }}
                aria-label={`Add ${itemName} to cart`}
              >
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
                  <Plus className="h-4 w-4 md:h-5 md:w-5 text-white" />
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
