import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlusCircle, MinusCircle } from "lucide-react"; // Added MinusCircle
import { useCart } from "../CartContext";
import { getLocalizedText, useGetCurrentLocale } from "@/lib/customerUtils";
import type { MenuItemDetailViewProps, ViewType, ViewProps } from "./types";
import type { RestaurantSettings } from "@/shared/types/customer"; // Corrected import path
import { useTranslations } from "next-intl";

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
  const [showAddedMessage, setShowAddedMessage] = useState(false); // Added state

  const quantityInCart = getQuantityInCart(item.id);

  const handleAddToCart = () => {
    addToCart(item);
    setShowAddedMessage(true); // Show message
    setTimeout(() => {
      setShowAddedMessage(false); // Hide message after 2.5 seconds
    }, 2500);
  };

  const handleIncreaseQuantity = () => {
    updateQuantity(item.id, quantityInCart + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantityInCart > 1) {
      updateQuantity(item.id, quantityInCart - 1);
    } else {
      removeFromCart(item.id); // Remove if quantity becomes 0
    }
  };

  // Placeholder for image if item.image_url is not available
  const imageUrl = item.image_url || `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_ja":item.name_ja}, locale))}`;

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
        <img
          src={imageUrl}
          alt={getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_ja":item.name_ja}, locale)}
          className="w-full h-64 object-cover"
        />

        <div className="p-6">
          <h1 className="text-3xl font-bold mb-3">
            {getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_ja":item.name_ja}, locale)}
          </h1>

          <p className="text-gray-600 mb-4 text-sm">
            {getLocalizedText({
              en: item.description_en || "",
              ja: item.description_ja || item.description_en || "",
              vi: item.description_vi || item.description_en || "",
              // Add other supported languages here, falling back to English
            }, locale)}
          </p>

          <p className="text-2xl font-semibold text-green-600 mb-6">
            {t('currency_format', { value: item.price / 100 })}
          </p>

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
          {showAddedMessage && ( // Message display relies solely on showAddedMessage state
            <div className="mt-4 text-center text-green-600 font-semibold text-sm py-2 px-3 bg-green-50 rounded-md border border-green-200">
              {t('menu_item_detail_added_to_cart_msg', { itemName: getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_ja":item.name_ja}, locale) })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerMenuItemDetailScreen;
