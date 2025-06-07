"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { PlusCircle } from "lucide-react";
import { getLocalizedText } from "./utils"; // Assuming this is web/components/features/customer/utils.ts
import type { ViewType, ViewProps } from "./screens/types"; // Path adjustment
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";

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
  setView: (view: ViewType, props?: ViewProps) => void; // Added
  tableId?: string; // Added
  sessionId?: string; // Added
  tableNumber?: string; // Added
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
  setView, // Added
  tableId, // Added
  sessionId, // Added
  tableNumber, // Added
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

  return (
    <motion.div
      animate={isAdding ? { scale: 1.05 } : { scale: 1 }}
    >
      <div className="flex flex-col group"> {/* Added group class here */}
        <Card className={`flex flex-col pt-0 pb-1 ${!canAddItems ? 'opacity-75' : ''} overflow-hidden`}>
          <div
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 ease-in-out" // Removed rounded-lg and overflow-hidden
            onClick={() => setView("menuitemdetail", { item, tableId, sessionId, tableNumber, canAddItems })}
          >
            {/* Image container now has overflow-hidden, image itself is rounded-t-2xl if not full card click area */}
            <img
              src={
                item.image_url ||
                "https://placehold.co/300x200/E2E8F0/334155?text=Food"
              }
              alt={getLocalizedText(
                item as unknown as Record<string, unknown>,
                locale,
              )}
              className="w-full h-40 object-cover group-hover:scale-105 transform transition-transform duration-150 ease-in-out" // Removed rounded-t-lg
              loading="lazy"
            />
            <div className="flex-grow p-2"> {/* Changed p-1 to p-2 for better spacing with hover bg */}
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {getLocalizedText(
                  item as unknown as Record<string, unknown>,
                  locale,
                )}
              </h4>
              {/* Description paragraph removed */}
              <StarRating
                value={item.averageRating || 0}
                count={item.reviewCount || 0}
              />
            </div>
          </div>
          <div className="flex justify-between items-center p-2"> {/* Changed px-1 to p-2 for content within clickable area */}
            <p className="text-lg font-bold" style={{ color: brandColor }}>
              {t("currency_format", { value: item.price })}
            </p>
            {/* Price and buttons are outside the clickable div */}
            {canAddItems ? (
              qtyInCart > 0 ? (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDecrease}
                    className="p-2 aspect-square rounded-full"
                    aria-label={t("menu.decrease_quantity")}
                  >
                    -
                  </Button>
                  <span className="font-medium w-5 text-center">{qtyInCart}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleIncrease}
                    className="p-2 aspect-square rounded-full"
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
                  {t("menu.add_to_cart")}
                </Button>
              )
            ) : (
              <div className="text-sm text-gray-500">
                {t("menu.view_only")}
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
