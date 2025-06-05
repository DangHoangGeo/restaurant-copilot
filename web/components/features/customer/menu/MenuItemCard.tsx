"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MinusCircle, Star } from "lucide-react";
// import { useCart } from "@/hooks/use-cart"; // Assuming useCart hook exists
import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils/currency"; // Assuming this utility exists
import StarRating from "@/components/shared/star-rating"; // Assuming this component exists

// Placeholder for useCart hook until it's implemented
const useCart = () => ({
  addToCart: (item: any) => console.log("Add to cart:", item.id),
  updateQuantity: (itemId: string, quantity: number) => console.log("Update quantity:", itemId, quantity),
  getQuantityInCart: (itemId: string) => {
    // console.log("Get quantity for:", itemId);
    return Math.floor(Math.random() * 3); // Random quantity for placeholder
  },
  // clearCart: () => console.log("Clear cart"),
  // items: [],
  // totalCartItems: 0,
  // totalCartPrice: 0,
});


interface MenuItem {
  id: string;
  name: string; // Should be localized if possible before passing to this component
  description?: string; // Should be localized
  price: number;
  imageUrl?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  // Add other relevant fields like allergens, dietary restrictions etc.
  // currencyCode?: string; // e.g., "JPY", "USD" - if not global
}

interface MenuItemCardProps {
  item: MenuItem;
  restaurantPrimaryColor: string;
  restaurantSecondaryColor?: string; // Optional, for more nuanced styling
}

export default function MenuItemCard({
  item,
  restaurantPrimaryColor,
  restaurantSecondaryColor,
}: MenuItemCardProps) {
  const t = useTranslations("CustomerMenu");
  const locale = useLocale();
  const { addToCart, updateQuantity, getQuantityInCart } = useCart();
  const quantityInCart = getQuantityInCart(item.id);

  const handleAddToCart = () => {
    addToCart({ ...item, quantity: 1 }); // Add item with initial quantity 1
  };

  const handleIncreaseQuantity = () => {
    updateQuantity(item.id, quantityInCart + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantityInCart > 0) {
      updateQuantity(item.id, quantityInCart - 1);
    }
  };

  // Determine text color based on primary color brightness (simple example)
  // A more robust solution might involve a color contrast checking library
  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const buttonTextColor = getTextColor(restaurantPrimaryColor);


  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <CardHeader className="p-0">
        {item.imageUrl ? (
          <div className="relative w-full h-48">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <Avatar className="h-24 w-24 text-lg">
              <AvatarFallback style={{backgroundColor: restaurantSecondaryColor || '#E0E0E0', color: restaurantPrimaryColor}}>
                {item.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl font-semibold mb-1">{item.name}</CardTitle>
        {item.description && (
          <p className="text-sm text-muted-foreground mb-2 min-h-[40px]">{item.description}</p>
        )}
        <div className="flex items-center justify-between mb-2">
          <p className="text-lg font-bold" style={{ color: restaurantPrimaryColor }}>
            {formatCurrency(item.price, "JPY", locale)} {/* TODO: Use actual currency from restaurant settings */}
          </p>
          {item.averageRating !== null && item.averageRating !== undefined && (
            <div className="flex items-center">
              <StarRating rating={item.averageRating} starSize={16} />
              <span className="ml-1 text-xs text-muted-foreground">({item.totalReviews || 0})</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {quantityInCart === 0 ? (
          <Button
            className="w-full"
            onClick={handleAddToCart}
            style={{ backgroundColor: restaurantPrimaryColor, color: buttonTextColor }}
          >
            {t("addToCart")}
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecreaseQuantity}
              style={{ borderColor: restaurantPrimaryColor, color: restaurantPrimaryColor }}
            >
              <MinusCircle className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold mx-4">{quantityInCart}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleIncreaseQuantity}
              style={{ borderColor: restaurantPrimaryColor, color: restaurantPrimaryColor }}
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
