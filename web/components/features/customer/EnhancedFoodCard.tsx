"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/enhanced-skeleton";
import { 
  PlusCircle, 
  Star, 
  Minus, 
  Plus, 
  Heart,
  Clock,
  TrendingUp,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { ViewType, ViewProps } from "./screens/types";
import type { FoodItem } from './FoodCard';

interface EnhancedFoodCardProps {
  item: FoodItem & {
    rating?: number;
    reviewCount?: number;
    isPopular?: boolean;
    isNew?: boolean;
    tags?: string[];
    estimatedPrepTime?: number;
    calories?: number;
    isRecommended?: boolean;
    recommendationReason?: string;
  };
  qtyInCart: number;
  onAdd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  brandColor: string;
  locale: string;
  canAddItems?: boolean;
  setView: (view: ViewType, props?: ViewProps) => void;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  viewMode?: "grid" | "list";
  onHover?: (itemId: string) => void;
  onImageLoad?: (itemId: string) => void;
  isLoading?: boolean;
  priority?: boolean; // For above-the-fold images
}

// Memoized component for better performance
export const EnhancedFoodCard = memo(function EnhancedFoodCard({
  item,
  qtyInCart,
  onAdd,
  onDecrease,
  onIncrease,
  brandColor,
  locale,
  canAddItems = true,
  setView,
  tableId,
  sessionId,
  tableNumber,
  onHover,
  onImageLoad,
  isLoading = false,
  priority = false,
}: EnhancedFoodCardProps) {
  const t = useTranslations("Customer");
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoized values for performance
  const itemName = useMemo(() => 
    getLocalizedText(
      { name_en: item.name_en, name_vi: item.name_vi || '', name_ja: item.name_ja || '' },
      locale,
    ), [item.name_en, item.name_vi, item.name_ja, locale]
  );

  const itemDescription = useMemo(() => 
    getLocalizedText(
      {
        name_en: item.description_en || "",
        name_vi: item.description_vi || "",
        name_ja: item.description_ja || ""
      },
      locale,
    ), [item.description_en, item.description_vi, item.description_ja, locale]
  );

  const priceDisplay = useMemo(() => {
    if (item.menu_item_sizes && item.menu_item_sizes.length > 0) {
      const prices = item.menu_item_sizes.map(s => s.price);
      if (prices.length === 0) {
        return `¥${item.price}`;
      }
      const minPrice = Math.min(...prices);
      return t('common.from_price', { price: `¥${minPrice}` });
    }
    return `¥${item.price}`;
  }, [item.menu_item_sizes, item.price, t]);

  // Optimized event handlers
  const handleAdd = useCallback(() => {
    if (!canAddItems) return;
    setIsAdding(true);
    onAdd();
    setTimeout(() => setIsAdding(false), 300);
  }, [canAddItems, onAdd]);

  const handleDecrease = useCallback(() => {
    if (!canAddItems) return;
    onDecrease();
  }, [canAddItems, onDecrease]);

  const handleIncrease = useCallback(() => {
    if (!canAddItems) return;
    onIncrease();
  }, [canAddItems, onIncrease]);

  const handleCardClick = useCallback(() => {
    setView("menuitemdetail", {
      item,
      tableId,
      sessionId,
      tableNumber,
      canAddItems
    });
  }, [setView, item, tableId, sessionId, tableNumber, canAddItems]);

  const handleMouseEnter = useCallback(() => {
    if (onHover) {
      onHover(item.id);
    }
  }, [onHover, item.id]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    if (onImageLoad) {
      onImageLoad(item.id);
    }
  }, [onImageLoad, item.id]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Card animations
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { y: -4, scale: 1.02 },
    tap: { scale: 0.98 }
  };

  const addButtonVariants = {
    idle: { scale: 1 },
    adding: { scale: 1.1 },
    added: { scale: 1, backgroundColor: '#10b981' }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <Skeleton variant="shimmer" className="w-full h-48" />
        <div className="p-4 space-y-3">
          <Skeleton variant="shimmer" className="h-6 w-3/4" />
          <Skeleton variant="shimmer" className="h-4 w-full" />
          <Skeleton variant="shimmer" className="h-4 w-2/3" />
          <div className="flex justify-between items-center">
            <Skeleton variant="shimmer" className="h-6 w-16" />
            <Skeleton variant="shimmer" className="h-9 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onMouseEnter={handleMouseEnter}
      className="h-full"
    >
      <Card className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl ${!canAddItems ? 'opacity-75' : ''} border-0 shadow-md relative`}>
        
        {/* Enhanced Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {item.isNew && (
            <Badge className="bg-green-500 text-white text-xs shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" />
              New
            </Badge>
          )}
          {item.isPopular && (
            <Badge className="bg-orange-500 text-white text-xs shadow-lg">
              <TrendingUp className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}
          {item.isRecommended && (
            <Badge className="bg-purple-500 text-white text-xs shadow-lg">
              <Heart className="h-3 w-3 mr-1" />
              For You
            </Badge>
          )}
        </div>

        {/* Enhanced Image with Next.js optimizations */}
        <div
          className="cursor-pointer flex-1"
          onClick={handleCardClick}
        >
          <div className="relative overflow-hidden rounded-t-lg bg-slate-100">
            {!imageLoaded && !imageError && (
              <Skeleton variant="shimmer" className="w-full h-48 absolute inset-0" />
            )}
            
            {!imageError ? (
              <Image
                src={item.image_url || "/placeholder-food.png"}
                width={400}
                height={300}
                alt={itemName}
                className={`w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading={priority ? "eager" : "lazy"}
                priority={priority}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                onLoad={handleImageLoad}
                onError={handleImageError}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-48 bg-slate-200 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
            )}

            {/* Enhanced Rating and Info */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {item.rating && item.rating > 0 && (
                <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {item.rating.toFixed(1)}
                  {item.reviewCount && (
                    <span className="text-white/70">({item.reviewCount})</span>
                  )}
                </div>
              )}
              
              {item.estimatedPrepTime && (
                <div className="bg-blue-500/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                  <Clock className="h-3 w-3" />
                  {item.estimatedPrepTime}m
                </div>
              )}
            </div>

            {/* Availability overlay */}
            {!item.available && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Unavailable
                </span>
              </div>
            )}
          </div>

          {/* Enhanced Content */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex-1">
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2 leading-tight">
                {itemName}
              </h4>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2 leading-relaxed">
                {itemDescription}
              </p>

              {/* Enhanced Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Recommendation reason */}
              {item.isRecommended && item.recommendationReason && (
                <p className="text-xs text-purple-600 dark:text-purple-400 italic mb-2">
                  {item.recommendationReason}
                </p>
              )}
            </div>

            {/* Enhanced Price and Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {priceDisplay}
                </span>
                {item.calories && (
                  <span className="text-xs text-slate-500">
                    {item.calories} cal
                  </span>
                )}
              </div>

              {/* Enhanced Add to Cart Controls */}
              <div className="flex items-center gap-2">
                {qtyInCart > 0 ? (
                  <motion.div 
                    className="flex items-center gap-2 bg-slate-100 rounded-full p-1"
                    layout
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDecrease}
                      disabled={!canAddItems}
                      className="h-8 w-8 p-0 rounded-full hover:bg-red-100"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <motion.span 
                      className="font-semibold min-w-[1.5rem] text-center"
                      key={qtyInCart}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {qtyInCart}
                    </motion.span>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleIncrease}
                      disabled={!canAddItems}
                      className="h-8 w-8 p-0 rounded-full hover:bg-green-100"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={addButtonVariants}
                    animate={isAdding ? "adding" : "idle"}
                  >
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={!canAddItems || !item.available}
                      className="rounded-full px-4"
                      style={{ backgroundColor: brandColor }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});
