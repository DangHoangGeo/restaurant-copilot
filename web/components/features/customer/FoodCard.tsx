"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { PlusCircle, Star } from "lucide-react";
import type { ViewType, ViewProps } from "./screens/types";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { getLocalizedText } from "@/lib/customerUtils";

export interface FoodItem {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[];
  averageRating?: number;
  reviewCount?: number;
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
      >
        <Card className={`group p-0 overflow-hidden transition-all duration-200 hover:shadow-lg ${!canAddItems ? 'opacity-75' : ''}`}>
          <div
            className="cursor-pointer"
            onClick={handleCardClick}
          >
            <div className="relative overflow-hidden">
              <img
                src={
                  item.image_url ||
                  "https://placehold.co/300x200/E2E8F0/334155?text=Food"
                }
                alt={itemName}
                className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            
            <div className="p-3">
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2">
                {itemName}
              </h4>
              
              {item.reviewCount && item.reviewCount > 0 && (
                <p className="text-xs text-slate-500 mb-2">
                  {item.reviewCount} review{item.reviewCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="px-3 pb-3 pt-0">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold" style={{ color: brandColor }}>
                {t("currency_format", { value: item.price })}
              </p>
              
              {canAddItems ? (
                qtyInCart > 0 ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDecrease}
                      className="h-8 w-8 rounded-full p-0"
                      aria-label={t("menu.decrease_quantity")}
                    >
                      -
                    </Button>
                    <span className="font-medium min-w-[1.5rem] text-center">{qtyInCart}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleIncrease}
                      className="h-8 w-8 rounded-full p-0"
                      aria-label={t("menu.increase_quantity")}
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    style={{ backgroundColor: brandColor }}
                    className="text-white hover:opacity-90"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )
              ) : (
                <div className="text-sm text-gray-500">
                  View only
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // List View Layout
  return (
    <motion.div
      animate={isAdding ? { scale: 1.02 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`group overflow-hidden transition-all duration-200 hover:shadow-md ${!canAddItems ? 'opacity-75' : ''}`}>
        <div
          className="cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="flex gap-4 p-4">
            <div className="relative flex-shrink-0 overflow-hidden rounded-lg">
              <img
                src={
                  item.image_url ||
                  "https://placehold.co/120x80/E2E8F0/334155?text=Food"
                }
                alt={itemName}
                className="w-24 h-16 object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {item.averageRating && item.averageRating > 0 && (
                <div className="absolute -top-1 -right-1 bg-black/70 text-white px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  {item.averageRating.toFixed(1)}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                  {itemName}
                </h4>
                <p className="text-lg font-bold ml-4 flex-shrink-0" style={{ color: brandColor }}>
                  {t("currency_format", { value: item.price })}
                </p>
              </div>
              
              {itemDescription && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  {itemDescription}
                </p>
              )}
              
              <div className="flex justify-between items-center">
                {item.reviewCount && item.reviewCount > 0 ? (
                  <p className="text-xs text-slate-500">
                    {item.reviewCount} review{item.reviewCount !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <div></div>
                )}
                
                {canAddItems ? (
                  qtyInCart > 0 ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDecrease}
                        className="h-8 w-8 rounded-full p-0"
                        aria-label={t("menu.decrease_quantity")}
                      >
                        -
                      </Button>
                      <span className="font-medium min-w-[1.5rem] text-center">{qtyInCart}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleIncrease}
                        className="h-8 w-8 rounded-full p-0"
                        aria-label={t("menu.increase_quantity")}
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      style={{ backgroundColor: brandColor }}
                      className="text-white hover:opacity-90"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )
                ) : (
                  <div className="text-sm text-gray-500">
                    View only
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
