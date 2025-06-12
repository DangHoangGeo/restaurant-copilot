"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle, Star, Minus, Plus } from "lucide-react";
import type { ViewType, ViewProps } from "./screens/types";
import type { MenuItemSize, Topping } from '@/shared/types/customer';
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { getLocalizedText } from "@/lib/customerUtils";
import Image from "next/image";

export interface FoodItem {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  rating?: number;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[];
  averageRating?: number;
  reviewCount?: number;
  menu_item_sizes?: MenuItemSize[];
  toppings?: Topping[];
}

interface FoodCardProps {
  item: FoodItem;
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
}

export function FoodCard({
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
  viewMode = "grid",
}: FoodCardProps) {
  const t = useTranslations("Customer");
  const [isAdding, setIsAdding] = useState(false);

  const getPriceDisplayString = (currentItem: FoodItem) => {
    if (currentItem.menu_item_sizes && currentItem.menu_item_sizes.length > 0) {
      const prices = currentItem.menu_item_sizes.map(s => s.price);
      if (prices.length === 0) { // Should not happen if menu_item_sizes has items
          return  `¥${(currentItem.price)}`;//`¥${(currentItem.price / 100).toFixed(0)}`;
      }
      const minPrice = Math.min(...prices);
      return t('common.from_price', { price: `¥${(minPrice)}` });
    }
    return `¥${(currentItem.price)}`;
  };

  const handleAdd = () => {
    if (!canAddItems) return;
    setIsAdding(true);
    onAdd();
    setTimeout(() => setIsAdding(false), 300);
  };

  const handleDecrease = () => {
    if (!canAddItems) return;
    onDecrease();
  };

  const handleIncrease = () => {
    if (!canAddItems) return;
    onIncrease();
  };

  const handleCardClick = () => {
    setView("menuitemdetail", {
      item,
      tableId,
      sessionId,
      tableNumber,
      canAddItems
    });
  };

  const itemName = getLocalizedText(
    { name_en: item.name_en, name_vi: item.name_vi, name_ja: item.name_ja },
    locale,
  );

  const itemDescription = getLocalizedText(
    {
      name_en: item.description_en || "",
      name_vi: item.description_vi || "",
      name_ja: item.description_ja || ""
    },
    locale,
  );

  // Grid View Layout
  if (viewMode === "grid") {
    return (
      <motion.div
        animate={isAdding ? { scale: 1.05 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!canAddItems ? 'opacity-75' : ''} border-0 shadow-md`}>
          <div
            className="cursor-pointer flex-1"
            onClick={handleCardClick}
          >
            <div className="relative overflow-hidden rounded-t-lg">
              <Image
                src={
                  item.image_url ||
                  "/placeholder-food.png"
                }
                width={300}
                height={200}
                alt={itemName}
                className="w-full h-36 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              {/* Rating badge */}
              {item.averageRating && item.averageRating > 0 && (
                <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {item.averageRating.toFixed(1)}
                </div>
              )}
              {/* Availability indicator */}
              {!item.available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Unavailable
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 leading-tight">
                {itemName}
              </h4>

              {itemDescription && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2 flex-1">
                  {itemDescription}
                </p>
              )}
              {( (item.menu_item_sizes && item.menu_item_sizes.length > 0) ||
                 (item.toppings && item.toppings.length > 0) ) && (
                <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 font-medium">
                  + Sizes/Toppings
                </p>
              )}

              {item.reviewCount && item.reviewCount > 0 && (
                <p className="text-xs text-slate-500 mb-2">
                  {item.reviewCount} review{item.reviewCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 mt-auto">
            <div className="flex justify-between items-center gap-2">
              <p className="text-base sm:text-lg font-bold truncate" style={{ color: brandColor }}>
                {getPriceDisplayString(item)}
              </p>

              {canAddItems ? (
                qtyInCart > 0 ? (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDecrease}
                      className="h-8 w-8 rounded-full p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={t("menu.decrease_quantity")}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-semibold min-w-[2rem] text-center text-sm px-2">{qtyInCart}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleIncrease}
                      className="h-8 w-8 rounded-full p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={t("menu.increase_quantity")}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    style={{ backgroundColor: brandColor }}
                    className="text-white hover:opacity-90 rounded-full px-3 py-2 text-xs sm:text-sm font-medium min-h-[36px] shadow-lg"
                  >
                    <PlusCircle className="h-3 w-3" />
                  </Button>
                )
              ) : (
                <div className="text-xs sm:text-sm text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {t("menu.view_only")}
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // List View Layout - Enhanced for mobile
  return (
    <motion.div
      animate={isAdding ? { scale: 1.02 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`p-0 group overflow-hidden transition-all duration-300 hover:shadow-lg ${!canAddItems ? 'opacity-75' : ''} border-0 shadow-sm`}>
        <div
        >
          <div className="flex gap-3 sm:gap-4 p-3 sm:p-2 cursor-pointe"
            onClick={handleCardClick}>

            <div className="relative flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={
                  item.image_url ||
                  "/placeholder-food.png"
                }
                width={80}
                height={64}
                alt={itemName}
                className="w-20 h-16 sm:w-24 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
                loading="lazy"
              />
              {item.averageRating && item.averageRating > 0 && (
                <div className="absolute -top-1 -right-1 bg-black/80 text-white px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm">
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  {item.averageRating.toFixed(1)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex justify-between items-start mb-1 gap-2">
                <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 flex-1">
                  {itemName}
                </h4>
              </div>

              {itemDescription && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  {itemDescription}
                </p>
              )}
              {( (item.menu_item_sizes && item.menu_item_sizes.length > 0) ||
                 (item.toppings && item.toppings.length > 0) ) && (
                <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 font-medium">
                  + Sizes/Toppings
                </p>
              )}
            </div>

          </div>
          <div className="mt-1 p-2">
            <div className="flex justify-between  mx-auto">

              <p className="text-md font-bold flex-shrink-0" style={{ color: brandColor }}>
                {getPriceDisplayString(item)}
              </p>
              {canAddItems ? (
                qtyInCart > 0 ? (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDecrease}
                      className="h-7 w-7 rounded-full p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={t("menu.decrease_quantity")}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-semibold min-w-[1.5rem] text-center text-sm px-1">{qtyInCart}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleIncrease}
                      className="h-7 w-7 rounded-full p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={t("menu.increase_quantity")}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    style={{ backgroundColor: brandColor }}
                    className="text-white hover:opacity-90 rounded-full px-3 py-2 text-xs font-medium min-h-[32px]"
                  >
                    <PlusCircle className="h-3 w-3" />
                  </Button>
                )
              ) : (
                <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {t("menu.view_only")}
                </div>
              )}
            </div>


          </div>
        </div>
      </Card>
    </motion.div>
  );
}
