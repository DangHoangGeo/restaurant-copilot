"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Edit3,
  Banknote
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/components/features/customer/CartContext';
import { getLocalizedText, useGetCurrentLocale } from '@/lib/customerUtils';

export default function CartPage() {
  const t = useTranslations('Customer.checkout');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useGetCurrentLocale();
  
  const { cart, updateQuantity, removeFromCart, totalCartPrice, totalCartItems, clearCart } = useCart();
  
  // URL parameters for session management
  const tableId = searchParams.get('tableId');
  const sessionId = searchParams.get('sessionId');
  const tableNumber = searchParams.get('tableNumber');
  
  // State management
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [editingNoteForItem, setEditingNoteForItem] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      const timer = setTimeout(() => {
        // Build navigation URL with session parameters
        const menuUrl = new URLSearchParams();
        if (tableId) menuUrl.set('tableId', tableId);
        if (sessionId) menuUrl.set('sessionId', sessionId);
        if (tableNumber) menuUrl.set('tableNumber', tableNumber);
        
        router.push(`/menu?${menuUrl.toString()}`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [cart.length, router, tableId, sessionId, tableNumber]);

  // Handle quantity updates
  const handleQuantityUpdate = (uniqueId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(uniqueId);
    } else {
      updateQuantity(uniqueId, newQty);
    }
  };

  // Handle individual item notes
  const handleEditNote = (uniqueId: string) => {
    setEditingNoteForItem(uniqueId);
    setTempNote(itemNotes[uniqueId] || '');
  };

  const handleSaveNote = () => {
    if (editingNoteForItem) {
      setItemNotes(prev => ({
        ...prev,
        [editingNoteForItem]: tempNote
      }));
      setEditingNoteForItem(null);
      setTempNote('');
    }
  };

  const handleCancelNote = () => {
    setEditingNoteForItem(null);
    setTempNote('');
  };

  // Get cart item name helper
  const getCartItemName = (item: { name_en?: string; name_ja?: string; name_vi?: string }) => {
    const localizedObj: { [key: string]: string } = {};
    if (item.name_en) localizedObj.name_en = item.name_en;
    if (item.name_ja) localizedObj.name_ja = item.name_ja;
    if (item.name_vi) localizedObj.name_vi = item.name_vi;
    return getLocalizedText(localizedObj, locale);
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!sessionId) {
      setOrderError(t('session_not_found_alert'));
      return;
    }

    if (cart.length === 0) {
      setOrderError(t('empty_cart_alert'));
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      // Prepare order items according to API schema, with individual item notes
      const orderItems = cart.map(item => ({
        menuItemId: item.itemId,
        quantity: item.qty,
        notes: itemNotes[item.uniqueId] || specialInstructions || undefined,
        menu_item_size_id: item.selectedSize?.id || undefined,
        topping_ids: item.selectedToppings?.map(t => t.id) || undefined,
      }));

      // Submit order to API
      const response = await fetch('/api/v1/customer/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          items: orderItems,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Clear cart and navigate to order confirmation
        clearCart();
        
        const orderUrl = new URLSearchParams();
        if (tableId) orderUrl.set('tableId', tableId);
        if (sessionId) orderUrl.set('sessionId', sessionId);
        if (tableNumber) orderUrl.set('tableNumber', tableNumber);
        
        router.push(`/order/${result.orderId}?${orderUrl.toString()}`);
      } else {
        setOrderError(result.error || t('order_failed_error'));
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setOrderError(t('order_failed_error_network'));
    } finally {
      setIsPlacingOrder(false);
      setShowConfirmDialog(false);
    }
  };

  // Navigation handlers
  const handleBackToMenu = () => {
    const menuUrl = new URLSearchParams();
    if (tableId) menuUrl.set('tableId', tableId);
    if (sessionId) menuUrl.set('sessionId', sessionId);
    if (tableNumber) menuUrl.set('tableNumber', tableNumber);
    
    router.push(`/menu?${menuUrl.toString()}`);
  };

  // Early return for empty cart
  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingCart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('empty_cart_title')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t('empty_cart_message')}</p>
          <Button onClick={handleBackToMenu} className="bg-primary text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon('back_to_menu')}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToMenu}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t('title')}</h1>
              {tableNumber && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('table_info', { number: tableNumber })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {totalCartItems} {totalCartItems === 1 ? t('item', { count: 1 }) : t('items', { count: totalCartItems })}
              </p>
              <p className="font-semibold">¥{totalCartPrice.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item, index) => {
                const localizedItemName = getCartItemName(item);

                const detailsDisplay: string[] = [];
                if (item.selectedSize) {
                  const localizedSizeName = getLocalizedText({
                    name_en: item.selectedSize.name_en,
                    name_ja: item.selectedSize.name_ja || '',
                    name_vi: item.selectedSize.name_vi || ''
                  }, locale);
                  detailsDisplay.push(localizedSizeName);
                }
                if (item.selectedToppings && item.selectedToppings.length > 0) {
                  const toppingNames = item.selectedToppings.map(t => 
                    getLocalizedText({
                      name_en: t.name_en || '',
                      name_ja: t.name_ja || '',
                      name_vi: t.name_vi || ''
                    }, locale)
                  ).join(', ');
                  detailsDisplay.push(`Toppings: ${toppingNames}`);
                }

                return (
                  <motion.div
                    key={item.uniqueId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex gap-4">
                        {/* Item Image */}
                        {item.imageUrl && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={localizedItemName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm sm:text-base truncate">
                                {localizedItemName}
                              </h3>
                              {detailsDisplay.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.selectedSize && (
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {getLocalizedText({
                                        name_en: item.selectedSize.name_en,
                                        name_ja: item.selectedSize.name_ja || '',
                                        name_vi: item.selectedSize.name_vi || ''
                                      }, locale)}
                                    </span>
                                  )}
                                  {item.selectedToppings && item.selectedToppings.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.selectedToppings.map((topping) => (
                                        <span key={topping.id} className="text-xs bg-blue-100 px-2 py-1 rounded">
                                          {getLocalizedText({
                                            name_en: topping.name_en || '',
                                            name_ja: topping.name_ja || '',
                                            name_vi: topping.name_vi || ''
                                          }, locale)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {t('price_each', { price: item.price.toFixed(0) })}
                              </p>
                              
                              {/* Individual Item Notes */}
                              {itemNotes[item.uniqueId] && (
                                <p className="text-sm text-blue-600 italic mt-2">
                                  {t('note')}: {itemNotes[item.uniqueId]}
                                </p>
                              )}
                              
                              {/* Note Edit Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNote(item.uniqueId)}
                                className="p-1 h-auto text-gray-500 hover:text-gray-700 mt-1"
                              >
                                <Edit3 className="h-4 w-4 mr-1" />
                                {itemNotes[item.uniqueId] ? (
                                  <span className="text-xs">{t('edit_note')}</span>
                                ) : (
                                  <span className="text-xs">{t('add_note')}</span>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quantity Controls and Remove */}
                        <div className="flex flex-col items-end gap-3">
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityUpdate(item.uniqueId, item.qty - 1)}
                              className="h-8 w-8 rounded-full p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-semibold min-w-[2rem] text-center">
                              {item.qty}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityUpdate(item.uniqueId, item.qty + 1)}
                              className="h-8 w-8 rounded-full p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Remove Item */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.uniqueId)}
                            className="h-8 w-8 rounded-full p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                          {/* Item Total */}
                          <div className="text-right">
                            <span className="font-semibold">
                              ¥{(item.price * item.qty).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t('order_summary')}</h2>
                
                {/* General Order Instructions */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    {t('general_instructions')}
                  </label>
                  <Textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder={t('general_instructions_placeholder')}
                    rows={3}
                    maxLength={200}
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {specialInstructions.length}/200 {t('characters')}
                  </p>
                </div>

                <div className="border-t border-gray-200 my-4" />

                {/* Order Totals */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span>{t('quantity')}</span>
                    <span>{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{t('total')}</span>
                    <span>¥{totalCartPrice.toFixed(0)}</span>
                  </div>
                </div>

                {/* Payment Method Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t('order_info')}
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    {t('order_placement_note')}
                  </p>
                </div>

                {/* Error Display */}
                {orderError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800 dark:text-red-200">{orderError}</span>
                    </div>
                  </div>
                )}

                {/* Place Order Button */}
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isPlacingOrder || cart.length === 0}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3"
                  size="lg"
                >
                  {isPlacingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      {t('placing_order')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('place_order_button')}
                    </>
                  )}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Item Note Edit Modal */}
      <AnimatePresence>
        {editingNoteForItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setEditingNoteForItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {t('add_note_for', { 
                  itemName: cart.find(c => c.uniqueId === editingNoteForItem) 
                    ? getCartItemName(cart.find(c => c.uniqueId === editingNoteForItem)!) 
                    : t('item') 
                })}
              </h3>
              <Textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder={t('note_placeholder')}
                rows={3}
                maxLength={200}
                className="resize-none mb-4"
              />
              <p className="text-xs text-slate-500 mb-4">
                {tempNote.length}/200 {t('characters')}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelNote}
                  className="flex-1"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSaveNote}
                  className="flex-1 bg-primary text-white"
                >
                  {t('save_note')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">{t('confirm_modal_title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t('confirm_message', {
                  items: totalCartItems,
                  total: `¥${totalCartPrice.toFixed(0)}`
                })}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="flex-1 bg-primary text-white"
                >
                  {isPlacingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      {t('confirming')}
                    </>
                  ) : (
                    t('confirm')
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
