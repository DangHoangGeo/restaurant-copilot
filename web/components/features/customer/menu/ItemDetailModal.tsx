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
  ChevronDown
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Reset state when modal opens with fresh props
  React.useEffect(() => {
    if (isOpen && item) {
      setQuantity(initialQuantity);
      // Set initial size (prioritize passed initial size, then default size)
      const defaultSize = initialSelectedSize || (item.menu_item_sizes?.[1] || item.menu_item_sizes?.[0] || null);
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
        en: item.description_en || '',
        vi: item.description_vi || '',
        ja: item.description_ja || ''
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
        className="w-full max-w-2xl h-[85vh] max-h-[90vh] overflow-hidden p-0 gap-0 bg-white dark:bg-gray-900 flex flex-col rounded-2xl sm:h-auto"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{itemName}</DialogTitle>
        
        {/* Enhanced Hero Image Section */}
        <div className="relative h-56 sm:h-72 w-full flex-shrink-0">
          {item.image_url && (
            <Image
              src={item.image_url}
              alt={itemName}
              fill
              className="object-cover transition-opacity duration-300"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.opacity = '1';
              }}
              onError={(e) => {
                // Hide the image if it fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
              style={{ opacity: 0 }}
            />
          )}
          
          {/* Fallback for missing images */}
          {!item.image_url && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-lime-900/20 flex flex-col items-center justify-center">
              <div className="text-center flex flex-col items-center justify-center h-full">
                <span className="text-4xl sm:text-9xl mb-4 block opacity-60">
                  🍽️
                </span>
                <span className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-white/30 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                  {itemName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          
          {/* Enhanced gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          
          {/* Item title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight drop-shadow-2xl">
                {itemName}
              </h1>
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
          <div className="p-4 space-y-4 min-h-0">
            {/* Item Description - Collapsible */}
            {itemDescription && itemDescription.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  >
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('description')}
                    </h3>
                    <motion.div
                      animate={{ rotate: isDescriptionExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {isDescriptionExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-visible"
                      >
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed whitespace-pre-wrap break-words">
                          {itemDescription}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!isDescriptionExpanded && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {itemDescription}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            {/* Size Selection - Compact Pills */}
            {availableSizes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-2"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('choose_size')}
                </h3>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {availableSizes
                    .sort((a, b) => a.position - b.position)
                    .map((size) => {
                      const sizeName = getLocalizedText(
                        { name_en: size.name_en, name_vi: size.name_vi || '', name_ja: size.name_ja || '' },
                        locale
                      );
                      
                      const isSelected = selectedSize?.id === size.id;
                      
                      return (
                        <Button
                          key={size.id}
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => handleSizeSelect(size)}
                          className={`flex-shrink-0 h-8 min-w-[60px] px-2 text-xs rounded-lg border transition-colors ${
                            isSelected 
                              ? 'shadow-sm' 
                              : 'hover:border-gray-300'
                          }`}
                          style={isSelected ? { 
                            backgroundColor: brandColor, 
                            borderColor: brandColor,
                            color: 'white'
                          } : undefined}
                          aria-label={`Select ${sizeName} size for ¥${size.price}`}
                        >
                          <span className="font-medium">{sizeName}</span>
                          <span className="ml-1 opacity-90">¥{size.price}</span>
                        </Button>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Topping Selection - Compact Grid */}
            {availableToppings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-2"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('add_toppings')}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableToppings
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
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
                          className={`h-8 px-2 text-xs rounded-lg border transition-colors w-full ${
                            isSelected 
                              ? 'shadow-sm' 
                              : 'hover:border-gray-300'
                          }`}
                          style={isSelected ? { 
                            backgroundColor: brandColor, 
                            borderColor: brandColor,
                            color: 'white'
                          } : undefined}
                          aria-label={`${isSelected ? 'Remove' : 'Add'} ${toppingName} topping for ¥${topping.price}`}
                        >
                          <span className="font-medium truncate text-xs mr-1">
                            {toppingName}
                          </span>
                          <span className="opacity-90">+¥{topping.price}</span>
                        </Button>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Compact Special Notes Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('special_instructions')}
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('special_instructions_placeholder')}
                className="min-h-[40px] max-h-[60px] resize-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors text-sm"
                style={{ fontSize: '16px' }} // Prevent mobile zoom
                maxLength={200}
                aria-describedby="notes-counter"
              />
              <p 
                id="notes-counter"
                className="text-xs text-gray-500 dark:text-gray-400 text-right"
              >
                {notes.length}/200
              </p>
            </motion.div>

            {/* Compact Price Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('price_details')}
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('base_price')}{selectedSize ? ` (${getLocalizedText({ name_en: selectedSize.name_en, name_vi: selectedSize.name_vi || '', name_ja: selectedSize.name_ja || '' }, locale)})` : ''}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ¥{selectedSize ? selectedSize.price : item.price}
                  </span>
                </div>
                {selectedToppings.length > 0 && selectedToppings.map((topping) => (
                  <div key={topping.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      + {getLocalizedText({ name_en: topping.name_en, name_vi: topping.name_vi || '', name_ja: topping.name_ja || '' }, locale)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">¥{topping.price}</span>
                  </div>
                ))}
                {quantity > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('quantity')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">× {quantity}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-white">
                  <span>{t('total')}</span>
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
          className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl p-4"
          style={{
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Compact Quantity Selector */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('quantity')}
            </h3>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 gap-0.5 shadow-sm">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityDecrease}
                disabled={quantity <= 1}
                className="h-8 w-8 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                aria-label={t('decrease_quantity')}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="font-bold min-w-[2.5rem] text-center text-base px-2 text-gray-900 dark:text-white">
                {quantity}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleQuantityIncrease}
                className="h-8 w-8 rounded-full p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('increase_quantity')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button with Enhanced Styling */}
          <Button
            onClick={handleAddToCart}
            disabled={!canAddItems || !item.available || isAdding}
            className="w-full h-12 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <span className="text-base font-bold bg-white/20 px-2 py-0.5 rounded-md">
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
