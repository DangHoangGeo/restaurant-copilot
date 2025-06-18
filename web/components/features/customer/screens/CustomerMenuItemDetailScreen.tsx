import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, PlusCircle, MinusCircle } from "lucide-react";
import { useCart } from "../CartContext";
import { getLocalizedText, useGetCurrentLocale } from "@/lib/customerUtils";
import type { MenuItemDetailViewProps, ViewType, ViewProps } from "./types";
import type { RestaurantSettings, MenuItemSize, Topping } from "@/shared/types/customer";
import { useTranslations } from "next-intl";
import Image from 'next/image';

interface CustomerMenuItemDetailScreenProps {
  setView: (view: ViewType, props?: ViewProps) => void;
  viewProps: MenuItemDetailViewProps;
  restaurantSettings?: RestaurantSettings; // Added this prop
}

const CustomerMenuItemDetailScreen: React.FC<CustomerMenuItemDetailScreenProps> = ({
  setView,
  viewProps,
}) => {
  const { item, canAddItems, tableId, sessionId, tableNumber } = viewProps;
  const { addToCart, updateQuantity, getQuantityInCart, removeFromCart } = useCart();
  const t = useTranslations('Customer');
  const tCommon = useTranslations('Common');
  const locale = useGetCurrentLocale();
  
  // State for size and topping selections
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  // Get available sizes and toppings from the item
  const availableSizes = useMemo(() => {
    return item.menu_item_sizes?.sort((a, b) => a.position - b.position) || [];
  }, [item.menu_item_sizes]);

  const availableToppings = useMemo(() => {
    return item.toppings?.sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
  }, [item.toppings]);

  // Set default size if available
  React.useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[1] || availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  // Calculate dynamic price based on selections
  const calculatedPrice = useMemo(() => {
    let basePrice = item.price;
    
    // Use size price if a size is selected
    if (selectedSize) {
      basePrice = selectedSize.price;
    }
    
    // Add topping prices
    const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
    
    return basePrice + toppingsPrice;
  }, [item.price, selectedSize, selectedToppings]);

  // Create unique ID for cart items based on selections
  const cartUniqueId = useMemo(() => {
    const toppingIds = selectedToppings.map(t => t.id).sort().join('_');
    return `${item.id}${selectedSize ? `_${selectedSize.id}` : ''}${toppingIds ? `_${toppingIds}` : ''}`;
  }, [item.id, selectedSize, selectedToppings]);

  const quantityInCart = getQuantityInCart(cartUniqueId);

  const handleSizeSelection = (size: MenuItemSize) => {
    setSelectedSize(size);
  };

  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const isSelected = prev.some(t => t.id === topping.id);
      if (isSelected) {
        return prev.filter(t => t.id !== topping.id);
      } else {
        return [...prev, topping];
      }
    });
  };

  const handleAddToCart = () => {
    addToCart(item, 1, selectedSize || undefined, selectedToppings.length > 0 ? selectedToppings : undefined);
    setShowAddedMessage(true);
    setTimeout(() => {
      setShowAddedMessage(false);
      // Navigate back to menu after adding to cart
      setView('menu', { tableId, sessionId, tableNumber, canAddItems });
    }, 1500);
  };

  const handleIncreaseQuantity = () => {
    updateQuantity(cartUniqueId, quantityInCart + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantityInCart > 1) {
      updateQuantity(cartUniqueId, quantityInCart - 1);
    } else {
      removeFromCart(cartUniqueId);
    }
  };

  // Placeholder for image if item.image_url is not available
  const imageUrl = item.image_url || `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi || "","name_ja":item.name_ja || ""}, locale))}`;

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <Button
        variant="outline"
        size="sm"
        className="mb-4 flex items-center"
        onClick={() => setView('menu', { tableId, sessionId, tableNumber, canAddItems })}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        {tCommon('back_to_menu')}
      </Button>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <Image
          src={imageUrl}
          alt={getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi || "","name_ja":item.name_ja || ""}, locale)}
          className="w-full h-64 object-cover"
          width={400}
          height={300}
        />

        <div className="p-4">
          <h1 className="text-3xl font-bold mb-2">
            {getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi || "","name_ja":item.name_ja || ""}, locale)}
          </h1>

          <p className="text-gray-600 mb-3 text-sm">
            {getLocalizedText({
              en: item.description_en || "",
              ja: item.description_ja || item.description_en || "",
              vi: item.description_vi || item.description_en || "",
            }, locale)}
          </p>

          {/* Size Selection */}
          {availableSizes.length > 0 && (
            <Card className="p-4 mb-2">
              <h3 className="text-lg font-semibold">{t('menu.select_size')}</h3>
              <div className="space-y-2">
                {availableSizes.map((size) => {
                  const sizeName = getLocalizedText({
                    name_en: size.name_en || '',
                    name_ja: size.name_ja || '',
                    name_vi: size.name_vi || ''
                  }, locale);
                  const isSelected = selectedSize?.id === size.id;
                  
                  return (
                    <Button
                      key={size.id}
                      variant={isSelected ? "default" : "outline"}
                      className="w-full justify-between"
                      onClick={() => handleSizeSelection(size)}
                    >
                      <span>{sizeName}</span>
                      <span>¥{size.price}</span>
                    </Button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Topping Selection */}
          {availableToppings.length > 0 && (
            <Card className="p-4 mb-4">
              <h3 className="text-lg font-semibold">{t('menu.select_toppings')}</h3>
              <div className="space-y-3">
                {availableToppings.map((topping) => {
                  const toppingName = getLocalizedText({
                    name_en: topping.name_en,
                    name_ja: topping.name_ja || topping.name_en,
                    name_vi: topping.name_vi || topping.name_en
                  }, locale);
                  const isSelected = selectedToppings.some(t => t.id === topping.id);
                  
                  return (
                    <div key={topping.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={topping.id}
                        checked={isSelected}
                        onCheckedChange={() => handleToppingToggle(topping)}
                      />
                      <Label htmlFor={topping.id} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center space-x-2">
                          <span>{toppingName}</span>
                          <Badge variant="secondary">
                            +¥{topping.price}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Dynamic Price Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">{t('menu.total_price')}</span>
              <span className="text-2xl font-semibold text-green-600">
                ¥{calculatedPrice}
              </span>
            </div>
            {(selectedSize || selectedToppings.length > 0) && (
              <div className="text-sm text-gray-500 mt-1">
                <div>
                  {t('menu.base_price')}: ¥{(selectedSize?.price || item.price)}
                </div>
                {selectedToppings.length > 0 && (
                  <div>
                    {t('menu.toppings_price')}: +¥{(selectedToppings.reduce((sum, t) => sum + t.price, 0))}
                  </div>
                )}
              </div>
            )}
          </div>

          {canAddItems ? (
            quantityInCart === 0 ? (
              <Button
                size="lg"
                className="w-full flex items-center justify-center text-lg"
                onClick={handleAddToCart}
              >
                <PlusCircle className="h-6 w-6 mr-3" />
                {t('menu_item_detail_add_to_cart')}
              </Button>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecreaseQuantity}
                  aria-label={t('decrease_quantity')}
                >
                  <MinusCircle className="h-6 w-6" />
                </Button>
                <span className="text-2xl font-semibold">{quantityInCart}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncreaseQuantity}
                  aria-label={t('increase_quantity')}
                >
                  <PlusCircle className="h-6 w-6" />
                </Button>
              </div>
            )
          ) : (
            <p className="text-center text-gray-500 italic py-4">
              {t('menu.view_only')}
            </p>
          )}
          
          {showAddedMessage && (
            <div className="mt-4 text-center text-green-600 font-semibold text-sm py-2 px-3 bg-green-50 rounded-md border border-green-200">
              {t('menu_item_detail_added_to_cart_msg', { itemName: getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi || "","name_ja":item.name_ja || ""}, locale) })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerMenuItemDetailScreen;
