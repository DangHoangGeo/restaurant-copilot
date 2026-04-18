"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import { 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  X
} from "lucide-react";
import { Table as TableType } from "../types";
import { Category, MenuItem, MenuItemSize, Topping } from '@/shared/types/menu';

interface OrderItemWithDetails {
  menu_item_id: string;
  quantity: number;
  notes?: string;
  menu_item_size_id?: string;
  topping_ids?: string[];
  // For display
  item: MenuItem;
  selectedSize?: MenuItemSize;
  selectedToppings?: Topping[];
  totalPrice: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableType[];
  categories: Category[];
  selectedTable: string;
  onTableChange: (tableId: string) => void;
  onCreateOrder: (orderData: {
    table_id: string;
    guest_count: number;
    order_items: Array<{
      menu_item_id: string;
      quantity: number;
      notes?: string;
      menu_item_size_id?: string;
      topping_ids?: string[];
    }>;
  }) => void;
  isCreating: boolean;
  locale: string;
}

export function NewOrderModal({
  isOpen,
  onClose,
  tables,
  categories,
  selectedTable,
  onTableChange,
  onCreateOrder,
  isCreating,
  locale
}: NewOrderModalProps) {
  const t = useTranslations("owner.orders");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orderItems, setOrderItems] = useState<OrderItemWithDetails[]>([]);
  const [guestCount, setGuestCount] = useState(1);
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItem | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [isMobileOrderSummaryOpen, setIsMobileOrderSummaryOpen] = useState(false);

  // Reset form
  const resetForm = useCallback(() => {
    setOrderItems([]);
    setSearchTerm("");
    setSelectedCategory("all");
    setGuestCount(1);
    setSelectedItemForCustomization(null);
    setIsCustomizationOpen(false);
    setIsMobileOrderSummaryOpen(false);
  }, []);

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Helper functions
  const getItemName = useCallback((item: MenuItem) => {
    switch (locale) {
      case 'ja': return item.name_ja || item.name_en;
      case 'vi': return item.name_vi || item.name_en;
      default: return item.name_en;
    }
  }, [locale]);

  const getSizeName = useCallback((size: MenuItemSize) => {
    switch (locale) {
      case 'ja': return size.name_ja || size.name_en;
      case 'vi': return size.name_vi || size.name_en;
      default: return size.name_en;
    }
  }, [locale]);

  const getToppingName = useCallback((topping: Topping) => {
    switch (locale) {
      case 'ja': return topping.name_ja || topping.name_en;
      case 'vi': return topping.name_vi || topping.name_en;
      default: return topping.name_en;
    }
  }, [locale]);

  // Filter menu items based on search and category
  const filteredItems = useMemo(() => {
    let items: MenuItem[] = [];
    
    if (selectedCategory === "all") {
      items = categories.flatMap(cat => cat.menu_items?.filter(item => item.available) || []);
    } else {
      const category = categories.find(cat => cat.id === selectedCategory);
      items = category?.menu_items?.filter(item => item.available) || [];
    }

    if (searchTerm) {
      items = items.filter(item => 
        getItemName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description_en && item.description_en.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return items;
  }, [categories, selectedCategory, searchTerm, getItemName]);

  // Calculate totals
  const orderTotal = orderItems.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add item to order (simple - no customization)
  const addSimpleItem = (item: MenuItem) => {
    const existingIndex = orderItems.findIndex(orderItem => 
      orderItem.menu_item_id === item.id &&
      !orderItem.menu_item_size_id &&
      (!orderItem.topping_ids || orderItem.topping_ids.length === 0)
    );

    if (existingIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      const newItem: OrderItemWithDetails = {
        menu_item_id: item.id,
        quantity: 1,
        item,
        totalPrice: item.price
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  // Open customization modal
  const openCustomization = (item: MenuItem) => {
    setSelectedItemForCustomization(item);
    setIsCustomizationOpen(true);
  };

  // Add customized item
  const addCustomizedItem = (
    item: MenuItem,
    selectedSize?: MenuItemSize,
    selectedToppings: Topping[] = [],
    notes?: string
  ) => {
    const basePrice = selectedSize ? selectedSize.price : item.price;
    const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
    const totalPrice = basePrice + toppingsPrice;

    const newItem: OrderItemWithDetails = {
      menu_item_id: item.id,
      quantity: 1,
      notes,
      menu_item_size_id: selectedSize?.id,
      topping_ids: selectedToppings.map(t => t.id!),
      item,
      selectedSize,
      selectedToppings,
      totalPrice
    };

    setOrderItems([...orderItems, newItem]);
    setIsCustomizationOpen(false);
    setSelectedItemForCustomization(null);
  };

  // Update item quantity
  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      const updatedItems = [...orderItems];
      updatedItems[index].quantity = newQuantity;
      setOrderItems(updatedItems);
    }
  };

  // Remove item
  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Handle order creation
  const handleCreateOrder = () => {
    if (!selectedTable || orderItems.length === 0) {
      return;
    }

    const orderData = {
      table_id: selectedTable,
      guest_count: guestCount,
      order_items: orderItems.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        notes: item.notes,
        menu_item_size_id: item.menu_item_size_id,
        topping_ids: item.topping_ids
      }))
    };

    onCreateOrder(orderData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-[90vw] !sm:max-w-none h-[95vh] p-0 flex flex-col" key={isOpen ? 'open' : 'closed'}>
          <DialogHeader className="p-4 pb-0 border-b border-gray-200 shrink-0">
            <DialogTitle className="text-lg font-semibold">
              {t('createNewOrder')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-0">
            {/* Responsive Layout: Mobile stacked, Tablet/Desktop side-by-side */}
            <div className="flex flex-col md:flex-row h-full">
              {/* Menu Items Panel */}
              <div className="md:w-3/5 lg:w-2/3 xl:w-3/4 border-r-0 md:border-r border-gray-200 flex flex-col min-h-0">
                {/* Search and Filters - Sticky */}
                <div className="p-4 border-b border-gray-200 space-y-3 shrink-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t('searchOrders')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("all")}
                        className="whitespace-nowrap"
                      >
                        All
                      </Button>
                      {categories.map(category => (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category.id)}
                          className="whitespace-nowrap"
                        >
                          {locale === 'ja' ? category.name_ja : locale === 'vi' ? category.name_vi : category.name_en}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Menu Items Grid - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-4 pb-64 md:pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {filteredItems.map(item => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 h-full flex flex-col">
                            <div className="flex-1 mb-4">
                              <h3 className="font-medium text-base truncate mb-2">
                                {getItemName(item)}
                              </h3>
                              <p className="text-sm text-gray-500">
                                ${item.price.toFixed(2)}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 mt-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addSimpleItem(item)}
                                className="flex-1 text-sm h-9"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                              
                              {(item.menu_item_sizes && item.menu_item_sizes.length > 0) ||
                               (item.toppings && item.toppings.length > 0) ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openCustomization(item)}
                                  className="flex-1 text-sm h-9"
                                >
                                  Custom
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Panel - Desktop: Sidebar, Mobile: Hidden (floating summary instead) */}
              <div className="hidden md:flex md:w-2/5 lg:w-1/3 xl:w-1/4 flex-col bg-gray-50 border-t md:border-t-0 border-gray-200">
                {/* Order Header - Sticky */}
                <div className="p-4 border-b border-gray-200 shrink-0 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-base">Order Summary</h3>
                    <Badge variant="secondary" className="text-xs">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  {/* Table and Guest Selection */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-1 block">Table</Label>
                      <Select value={selectedTable} onValueChange={onTableChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t('chooseTable')} />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map(table => (
                            <SelectItem key={table.id} value={table.id}>
                              {table.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-1 block">Guests</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                          disabled={guestCount <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                          {guestCount}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGuestCount(guestCount + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-4">
                    {orderItems.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No items added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map((orderItem, index) => (
                          <Card key={index} className="bg-white border border-gray-200">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-medium text-sm truncate">
                                    {getItemName(orderItem.item)}
                                  </h4>
                                  
                                  {orderItem.selectedSize && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Size: {getSizeName(orderItem.selectedSize)}
                                    </p>
                                  )}
                                  
                                  {orderItem.selectedToppings && orderItem.selectedToppings.length > 0 && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Toppings: {orderItem.selectedToppings.map(t => getToppingName(t)).join(', ')}
                                    </p>
                                  )}
                                  
                                  {orderItem.notes && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Note: {orderItem.notes}
                                    </p>
                                  )}
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(index)}
                                  className="text-red-500 hover:text-red-700 p-1 h-6 w-6 shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateItemQuantity(index, orderItem.quantity - 1)}
                                    className="w-7 h-7 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="px-2 py-1 text-sm font-medium min-w-[1.5rem] text-center">
                                    {orderItem.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateItemQuantity(index, orderItem.quantity + 1)}
                                    className="w-7 h-7 p-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                <div className="text-sm font-medium">
                                  ${(orderItem.totalPrice * orderItem.quantity).toFixed(2)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Footer - Sticky */}
                <div className="p-4 border-t border-gray-200 space-y-3 shrink-0 bg-white">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <LoadingButton
                      onClick={handleCreateOrder}
                      loading={isCreating}
                      disabled={!selectedTable || orderItems.length === 0}
                      className="flex-1"
                    >
                      Create Order
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Floating Order Summary */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-h-[40vh] flex flex-col">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsMobileOrderSummaryOpen(true)}
            >
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium block">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Tap to review order
                  </span>
                </div>
              </div>
              <span className="text-xl font-semibold">
                ${orderTotal.toFixed(2)}
              </span>
            </div>
            
            {/* Table and Guest Selection for Mobile */}
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <Label className="text-xs font-medium mb-1 block text-gray-600">Table</Label>
                  <Select value={selectedTable} onValueChange={onTableChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t('chooseTable')} />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-shrink-0">
                  <Label className="text-xs font-medium mb-1 block text-gray-600">Guests</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      disabled={guestCount <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="px-3 py-2 text-sm font-medium min-w-[3rem] text-center bg-gray-50 rounded">
                      {guestCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <LoadingButton
                  onClick={handleCreateOrder}
                  loading={isCreating}
                  disabled={!selectedTable || orderItems.length === 0}
                  className="flex-1 h-11"
                >
                  Create Order
                </LoadingButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Order Summary Modal */}
      <Dialog open={isMobileOrderSummaryOpen} onOpenChange={setIsMobileOrderSummaryOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-0 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                Order Summary
              </DialogTitle>
              <Badge variant="secondary" className="text-xs">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              {orderItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((orderItem, index) => (
                    <Card key={index} className="bg-white border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-medium text-sm truncate">
                              {getItemName(orderItem.item)}
                            </h4>
                            
                            {orderItem.selectedSize && (
                              <p className="text-xs text-gray-600 mt-1">
                                Size: {getSizeName(orderItem.selectedSize)}
                              </p>
                            )}
                            
                            {orderItem.selectedToppings && orderItem.selectedToppings.length > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Toppings: {orderItem.selectedToppings.map(t => getToppingName(t)).join(', ')}
                              </p>
                            )}
                            
                            {orderItem.notes && (
                              <p className="text-xs text-gray-600 mt-1">
                                Note: {orderItem.notes}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 p-1 h-8 w-8 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(index, orderItem.quantity - 1)}
                              className="w-8 h-8 p-0"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center bg-gray-50 rounded">
                              {orderItem.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(index, orderItem.quantity + 1)}
                              className="w-8 h-8 p-0"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="text-sm font-medium">
                            ${(orderItem.totalPrice * orderItem.quantity).toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 space-y-3 shrink-0 bg-white">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total</span>
              <span>${orderTotal.toFixed(2)}</span>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setIsMobileOrderSummaryOpen(false)}
              className="w-full h-11"
            >
              Continue Adding Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customization Modal */}
      {selectedItemForCustomization && (
        <CustomizationModal
          item={selectedItemForCustomization}
          isOpen={isCustomizationOpen}
          onClose={() => {
            setIsCustomizationOpen(false);
            setSelectedItemForCustomization(null);
          }}
          onAddToOrder={addCustomizedItem}
          locale={locale}
        />
      )}
    </>
  );
}

// Customization Modal Component
interface CustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: MenuItem, selectedSize?: MenuItemSize, selectedToppings?: Topping[], notes?: string) => void;
  locale: string;
}

function CustomizationModal({ item, isOpen, onClose, onAddToOrder, locale }: CustomizationModalProps) {
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | undefined>();
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [notes, setNotes] = useState("");

  const getItemName = (item: MenuItem) => {
    switch (locale) {
      case 'ja': return item.name_ja || item.name_en;
      case 'vi': return item.name_vi || item.name_en;
      default: return item.name_en;
    }
  };

  const getSizeName = (size: MenuItemSize) => {
    switch (locale) {
      case 'ja': return size.name_ja || size.name_en;
      case 'vi': return size.name_vi || size.name_en;
      default: return size.name_en;
    }
  };

  const getToppingName = (topping: Topping) => {
    switch (locale) {
      case 'ja': return topping.name_ja || topping.name_en;
      case 'vi': return topping.name_vi || topping.name_en;
      default: return topping.name_en;
    }
  };

  const handleToppingChange = (topping: Topping, checked: boolean) => {
    if (checked) {
      setSelectedToppings([...selectedToppings, topping]);
    } else {
      setSelectedToppings(selectedToppings.filter(t => t.id !== topping.id));
    }
  };

  const calculateTotal = () => {
    const basePrice = selectedSize ? selectedSize.price : item.price;
    const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
    return basePrice + toppingsPrice;
  };

  const handleAddToOrder = () => {
    onAddToOrder(item, selectedSize, selectedToppings, notes);
    // Reset state
    setSelectedSize(undefined);
    setSelectedToppings([]);
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg">Customize {getItemName(item)}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-6 pr-2">
            {/* Size Selection */}
            {item.menu_item_sizes && item.menu_item_sizes.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Size</Label>
                <div className="space-y-2">
                  {item.menu_item_sizes.map(size => (
                    <div
                      key={size.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSize?.id === size.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedSize?.id === size.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {selectedSize?.id === size.id && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{getSizeName(size)}</span>
                      </div>
                      <span className="text-sm font-medium">${size.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings Selection */}
            {item.toppings && item.toppings.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Toppings</Label>
                <div className="space-y-2">
                  {item.toppings.map(topping => (
                    <div
                      key={topping.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={topping.id}
                          checked={selectedToppings.some(t => t.id === topping.id)}
                          onCheckedChange={(checked) => handleToppingChange(topping, checked as boolean)}
                        />
                        <Label htmlFor={topping.id} className="text-sm font-medium">
                          {getToppingName(topping)}
                        </Label>
                      </div>
                      <span className="text-sm font-medium">+${topping.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Special Notes</Label>
              <Input
                placeholder="Add any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t mt-4 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-semibold">${calculateTotal().toFixed(2)}</span>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11">
              Cancel
            </Button>
            <Button onClick={handleAddToOrder} className="flex-1 h-11">
              Add to Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
