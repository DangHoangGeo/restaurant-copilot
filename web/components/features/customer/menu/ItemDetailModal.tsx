'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  Star, 
  Minus, 
  Plus, 
  ShoppingCart,
  Info
} from 'lucide-react';
import Image from 'next/image';
import { getLocalizedText } from '@/lib/customerUtils';
import type { FoodItem } from '@/components/features/customer/FoodCard';
import type { MenuItemSize, Topping } from '@/shared/types/menu';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  locale: string;
  brandColor: string;
  onAddToCart: (item: FoodItem, quantity: number, selectedSize?: MenuItemSize, selectedToppings?: Topping[], notes?: string) => void;
  canAddItems?: boolean;
  initialQuantity?: number;
}

export function ItemDetailModal({
  isOpen,
  onClose,
  item,
  locale,
  brandColor,
  onAddToCart,
  canAddItems = true,
  initialQuantity = 1
}: ItemDetailModalProps) {
  // State for customization
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Reset state when item changes
  React.useEffect(() => {
    if (item) {
      setQuantity(initialQuantity);
      // Set default size if available
      const defaultSize = item.menu_item_sizes?.[0];
      setSelectedSize(defaultSize && defaultSize.id ? defaultSize : null);
      setSelectedToppings([]);
      setNotes('');
    }
  }, [item, initialQuantity]);

  // Memoized values
  const itemName = useMemo(() => {
    if (!item) return '';
    return getLocalizedText(
      { name_en: item.name_en, name_vi: item.name_vi || '', name_ja: item.name_ja || '' },
      locale
    );
  }, [item, locale]);

  const itemDescription = useMemo(() => {
    if (!item) return '';
    return getLocalizedText(
      {
        name_en: item.description_en || '',
        name_vi: item.description_vi || '',
        name_ja: item.description_ja || ''
      },
      locale
    );
  }, [item, locale]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    
    const basePrice = selectedSize ? selectedSize.price : item.price;
    const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
    
    return (basePrice + toppingsPrice) * quantity;
  }, [item, selectedSize, selectedToppings, quantity]);

  // Handle quantity changes
  const handleQuantityDecrease = useCallback(() => {
    setQuantity(prev => Math.max(1, prev - 1));
  }, []);

  const handleQuantityIncrease = useCallback(() => {
    setQuantity(prev => prev + 1);
  }, []);

  // Handle size selection
  const handleSizeSelect = useCallback((size: MenuItemSize) => {
    setSelectedSize(size);
  }, []);

  // Handle topping selection
  const handleToppingToggle = useCallback((topping: Topping) => {
    setSelectedToppings(prev => {
      const isSelected = prev.some(t => t.id === topping.id);
      if (isSelected) {
        return prev.filter(t => t.id !== topping.id);
      } else {
        return [...prev, topping];
      }
    });
  }, []);

  // Handle add to cart
  const handleAddToCart = useCallback(async () => {
    if (!item || !canAddItems) return;
    
    setIsAdding(true);
    try {
      await onAddToCart(item, quantity, selectedSize || undefined, selectedToppings, notes);
      onClose();
    } catch (error) {
      console.error('Failed to add item to cart:', error);
    } finally {
      setIsAdding(false);
    }
  }, [item, quantity, selectedSize, selectedToppings, notes, onAddToCart, onClose, canAddItems]);

  if (!item) return null;

  const availableSizes = item.menu_item_sizes || [];
  const availableToppings = item.toppings || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full h-[95vh] sm:h-[90vh] overflow-hidden p-0 gap-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col m-0">
        <DialogTitle className="sr-only">{itemName}</DialogTitle>
        
        {/* Header Image */}
        <div className="relative h-48 sm:h-64 w-full flex-shrink-0">
          <Image
            src={item.image_url || '/placeholder-food.png'}
            alt={itemName}
            fill
            className="object-cover"
            priority
          />
          
          {/* Dark overlay for better text readability */}
          
          {/* Item name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 sm:p-4">
            <h1 className="text-white text-lg sm:text-xl font-bold mb-1 drop-shadow-lg">{itemName}</h1>
            {itemDescription && (
              <p className="text-white/95 text-xs sm:text-sm line-clamp-2 drop-shadow-md">
                {itemDescription}
              </p>
            )}
          </div>
          
          {/* Close button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full bg-white/95 hover:bg-white z-10 shadow-lg"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Rating badge */}
          {item.averageRating && item.averageRating > 0 && (
            <div className="absolute top-3 left-3 bg-black/90 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm shadow-lg">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {item.averageRating.toFixed(1)}
            </div>
          )}

          {/* Availability overlay */}
          {!item.available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Currently Unavailable
              </Badge>
            </div>
          )}
        </div>

        {/* Content - Scrollable with smooth scrolling */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-3 space-y-3">
            {/* Size Selection - Horizontal Pills */}
            {availableSizes.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
                  <Info className="h-3 w-3" />
                  Choose Size
                </h3>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {availableSizes
                    .sort((a, b) => a.position - b.position)
                    .map((size) => {
                      const sizeName = getLocalizedText(
                        { name_en: size.name_en, name_vi: size.name_vi || '', name_ja: size.name_ja || '' },
                        locale
                      );
                      
                      return (
                        <Button
                          key={size.id}
                          variant={selectedSize?.id === size.id ? 'default' : 'outline'}
                          onClick={() => handleSizeSelect(size)}
                          className="flex-shrink-0 h-16 w-20 px-2 py-1 text-xs rounded-lg flex flex-col justify-center items-center"
                          style={selectedSize?.id === size.id ? { backgroundColor: brandColor } : undefined}
                        >
                          <span className="font-medium text-center leading-tight">{sizeName}</span>
                          <span className="text-xs opacity-90 font-bold">¥{size.price}</span>
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Topping Selection - Compact Grid */}
            {availableToppings.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
                  <Info className="h-3 w-3" />
                  Add Toppings
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableToppings
                    .sort((a, b) => a.position - b.position)
                    .map((topping) => {
                      const toppingName = getLocalizedText(
                        { name_en: topping.name_en, name_vi: topping.name_vi || '', name_ja: topping.name_ja || '' },
                        locale
                      );
                      
                      const isSelected = selectedToppings.some(t => t.id === topping.id);
                      
                      return (
                        <Button
                          key={topping.id}
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => handleToppingToggle(topping)}
                          className="h-16 p-2 text-xs justify-center items-center flex flex-col rounded-lg"
                          style={isSelected ? { backgroundColor: brandColor } : undefined}
                        >
                          <span className="font-medium text-center leading-tight line-clamp-2 mb-1">{toppingName}</span>
                          <span className="text-xs opacity-90 font-bold">+¥{topping.price}</span>
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Special Notes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Special Instructions (Optional)</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or dietary requirements..."
                className="min-h-[50px] resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-sm"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{notes.length}/200 characters</p>
            </div>

            {/* Price Breakdown */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Price Details</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Base price {selectedSize ? `(${getLocalizedText({ name_en: selectedSize.name_en, name_vi: selectedSize.name_vi || '', name_ja: selectedSize.name_ja || '' }, locale)})` : ''}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">¥{selectedSize ? selectedSize.price : item.price}</span>
                </div>
                {selectedToppings.length > 0 && selectedToppings.map((topping) => (
                  <div key={topping.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      + {getLocalizedText({ name_en: topping.name_en, name_vi: topping.name_vi || '', name_ja: topping.name_ja || '' }, locale)}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">¥{topping.price}</span>
                  </div>
                ))}
                {quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="font-medium text-gray-900 dark:text-white">× {quantity}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-600 pt-1.5 text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>¥{totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Section - Quantity & Add to Cart */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quantity</h3>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityDecrease}
                disabled={quantity <= 1}
                className="h-8 w-8 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[2.5rem] text-center text-base px-2 text-gray-900 dark:text-white">
                {quantity}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityIncrease}
                className="h-8 w-8 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!canAddItems || !item.available || isAdding}
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-lg shadow-lg"
            style={{ backgroundColor: canAddItems && item.available ? brandColor : undefined }}
          >
            <AnimatePresence mode="wait">
              {isAdding ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding...
                </motion.div>
              ) : (
                <motion.div
                  key="add"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
