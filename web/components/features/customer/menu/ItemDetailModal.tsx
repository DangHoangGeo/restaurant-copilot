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
import { useTranslations } from 'next-intl';
import { getLocalizedText } from '@/lib/customerUtils';
import type { FoodItem, MenuItemSize, Topping } from '@/shared/types/menu';



interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  locale: string;
  brandColor: string;
  onAddToCart: (item: FoodItem, quantity: number, selectedSize?: MenuItemSize, selectedToppings?: Topping[], notes?: string) => void;
  canAddItems?: boolean;
  initialQuantity?: number;
  initialSelectedSize?: MenuItemSize | null;
  initialSelectedToppings?: Topping[];
  initialNotes?: string;
  isEditMode?: boolean;
}

export function ItemDetailModal({
  isOpen,
  onClose,
  item,
  locale,
  brandColor,
  onAddToCart,
  canAddItems = true,
  initialQuantity = 1,
  initialSelectedSize = null,
  initialSelectedToppings = [],
  initialNotes = "",
  isEditMode = false
}: ItemDetailModalProps) {
  // Internationalization
  const t = useTranslations('customer.menu.item_detail');
  
  // State for customization
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(initialSelectedSize);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>(initialSelectedToppings);
  const [notes, setNotes] = useState(initialNotes);
  const [isAdding, setIsAdding] = useState(false);

  // Reset state when modal opens with fresh props
  React.useEffect(() => {
    if (isOpen && item) {
      setQuantity(initialQuantity);
      // Set initial size (prioritize passed initial size, then default size)
      const defaultSize = initialSelectedSize || (item.menu_item_sizes?.[0]);
      setSelectedSize(defaultSize && defaultSize.id ? defaultSize : null);
      setSelectedToppings([...initialSelectedToppings]);
      setNotes(initialNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]); // Only depend on isOpen and item.id to avoid infinite loops

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
      <DialogContent 
        className="max-w-2xl w-full h-[100vh] sm:h-[95vh] overflow-hidden p-0 gap-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col m-0 
                   sm:rounded-t-2xl sm:rounded-b-none sm:max-h-[90vh]"
        style={{
          borderRadius: '20px 20px 0 0',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          minHeight: '100dvh' // Dynamic viewport height for mobile
        }}
      >
        <DialogTitle className="sr-only">{itemName}</DialogTitle>
        
        {/* Enhanced Hero Image Section */}
        <div className="relative h-56 sm:h-72 w-full flex-shrink-0">
          <Image
            src={item.image_url || '/placeholder-food.png'}
            alt={itemName}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          
          {/* Enhanced gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          
          {/* Item information overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight drop-shadow-2xl">
                {itemName}
              </h1>
              {itemDescription && (
                <p className="text-white/95 text-sm sm:text-base line-clamp-2 drop-shadow-lg">
                  {itemDescription}
                </p>
              )}
            </motion.div>
          </div>
          
          {/* Enhanced close button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/95 hover:bg-white z-10 shadow-lg backdrop-blur-sm h-10 w-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Enhanced rating badge */}
          {item.averageRating && item.averageRating > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute top-4 left-4 bg-black/90 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 backdrop-blur-sm shadow-lg"
            >
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {item.averageRating.toFixed(1)}
            </motion.div>
          )}

          {/* Availability overlay */}
          {!item.available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Badge variant="destructive" className="text-lg px-6 py-3 font-semibold">
                {t('currently_unavailable')}
              </Badge>
            </div>
          )}
        </div>

        {/* Enhanced Content Section - Scrollable with smooth scrolling */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Size Selection - Enhanced Horizontal Pills */}
            {availableSizes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-3"
              >
                <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Info className="h-4 w-4 text-gray-500" />
                  {t('choose_size')}
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {availableSizes
                    .sort((a, b) => a.position - b.position)
                    .map((size, index) => {
                      const sizeName = getLocalizedText(
                        { name_en: size.name_en, name_vi: size.name_vi || '', name_ja: size.name_ja || '' },
                        locale
                      );
                      
                      const isSelected = selectedSize?.id === size.id;
                      
                      return (
                        <motion.div
                          key={size.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                        >
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => handleSizeSelect(size)}
                            className={`flex-shrink-0 h-20 min-w-[80px] px-3 py-2 text-xs rounded-2xl flex flex-col justify-center items-center border-2 transition-all duration-200 ${
                              isSelected 
                                ? 'shadow-lg scale-105' 
                                : 'hover:border-gray-300 hover:shadow-md'
                            }`}
                            style={isSelected ? { 
                              backgroundColor: brandColor, 
                              borderColor: brandColor,
                              color: 'white'
                            } : undefined}
                            aria-label={`Select ${sizeName} size for ¥${size.price}`}
                          >
                            <span className="font-semibold text-center leading-tight">{sizeName}</span>
                            <span className="text-xs opacity-90 font-bold mt-1">¥{size.price}</span>
                          </Button>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Topping Selection - Enhanced Compact Grid */}
            {availableToppings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-3"
              >
                <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Info className="h-4 w-4 text-gray-500" />
                  {t('add_toppings')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableToppings
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map((topping, index) => {
                      const toppingName = getLocalizedText(
                        { name_en: topping.name_en, name_vi: topping.name_vi || '', name_ja: topping.name_ja || '' },
                        locale
                      );
                      
                      const isSelected = selectedToppings.some(t => t.id === topping.id);
                      
                      return (
                        <motion.div
                          key={topping.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
                        >
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => handleToppingToggle(topping)}
                            className={`h-20 p-3 text-xs justify-center items-center flex flex-col rounded-2xl border-2 transition-all duration-200 w-full ${
                              isSelected 
                                ? 'shadow-lg scale-105' 
                                : 'hover:border-gray-300 hover:shadow-md'
                            }`}
                            style={isSelected ? { 
                              backgroundColor: brandColor, 
                              borderColor: brandColor,
                              color: 'white'
                            } : undefined}
                            aria-label={`${isSelected ? 'Remove' : 'Add'} ${toppingName} topping for ¥${topping.price}`}
                          >
                            <span className="font-semibold text-center leading-tight line-clamp-2 mb-1">
                              {toppingName}
                            </span>
                            <span className="text-xs opacity-90 font-bold">+¥{topping.price}</span>
                          </Button>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Enhanced Special Notes Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('special_instructions')}
              </h3>
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('special_instructions_placeholder')}
                  className="min-h-[60px] resize-none bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-sm rounded-2xl focus:border-opacity-60 transition-colors"
                  style={{ 
                    focusBorderColor: brandColor,
                    '--tw-ring-color': brandColor + '40'
                  } as React.CSSProperties}
                  maxLength={200}
                  aria-describedby="notes-counter"
                />
                <p 
                  id="notes-counter"
                  className="text-xs text-gray-500 dark:text-gray-400 text-right"
                >
                  {t('characters_remaining', { count: notes.length })}
                </p>
              </div>
            </motion.div>

            {/* Enhanced Price Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-3 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('price_details')}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('base_price')} {selectedSize ? `(${getLocalizedText({ name_en: selectedSize.name_en, name_vi: selectedSize.name_vi || '', name_ja: selectedSize.name_ja || '' }, locale)})` : ''}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ¥{selectedSize ? selectedSize.price : item.price}
                  </span>
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
                    <span className="text-gray-600 dark:text-gray-400">{t('quantity')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">× {quantity}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-white">
                  <span>{t('total')}:</span>
                  <span>¥{totalPrice}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Sticky Bottom Section with Safe Area Support */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            paddingTop: '16px',
            paddingLeft: 'max(env(safe-area-inset-left, 16px), 16px)',
            paddingRight: 'max(env(safe-area-inset-right, 16px), 16px)'
          }}
        >
          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('quantity')}
            </h3>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1 shadow-md">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityDecrease}
                disabled={quantity <= 1}
                className="h-10 w-10 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                aria-label={t('decrease_quantity')}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold min-w-[3rem] text-center text-lg px-3 text-gray-900 dark:text-white">
                {quantity}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityIncrease}
                className="h-10 w-10 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('increase_quantity')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button with Enhanced Styling */}
          <Button
            onClick={handleAddToCart}
            disabled={!canAddItems || !item.available || isAdding}
            className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: canAddItems && item.available ? brandColor : undefined,
              borderColor: canAddItems && item.available ? brandColor : undefined
            }}
            aria-label={`${isEditMode ? t('update') : t('add_to_cart')} - ¥${totalPrice}`}
          >
            <AnimatePresence mode="wait">
              {isAdding ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>{t('adding')}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="add"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between w-full px-2"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span>{isEditMode ? t('update') : t('add_to_cart')}</span>
                  </div>
                  <span className="text-lg font-black bg-white/20 px-3 py-1 rounded-lg">
                    ¥{totalPrice}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
