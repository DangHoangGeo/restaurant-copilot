"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { PlusCircle } from "lucide-react";
import { getLocalizedText } from "./utils";
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
}

export function FoodCard({
  item,
  qtyInCart,
  onAdd,
  onDecrease,
  onIncrease,
  brandColor,
  locale,
}: FoodCardProps) {
  const t = useTranslations("Customer");
  const [isAdding, setIsAdding] = useState(false);
  const handleAdd = () => {
    setIsAdding(true);
    onAdd();
    setTimeout(() => setIsAdding(false), 300);
  };
  return (
    
      <motion.div
        animate={isAdding ? { scale: 1.05 } : { scale: 1 }}
      >
        <div className="flex flex-col">
          <Card className="flex flex-col p-2">
            <img
              src={
                item.image_url ||
                "https://placehold.co/300x200/E2E8F0/334155?text=Food"
              }
              alt={getLocalizedText(
                item as unknown as Record<string, unknown>,
                locale,
              )}
              className="w-full h-40 object-cover rounded-t-2xl mb-3"
              loading="lazy"
            />
            <div className="flex-grow">
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {getLocalizedText(
                  item as unknown as Record<string, unknown>,
                  locale,
                )}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 h-10 overflow-hidden">
                {getLocalizedText(
                  {
                    [`description_${locale}`]:
                      item[
                        `description_${locale as "en" | "ja" | "vi"}` as keyof FoodItem
                      ],
                    description_en: item.description_en,
                  },
                  locale,
                )}
              </p>
              <StarRating
                value={item.averageRating || 0}
                count={item.reviewCount || 0}
                size="sm"
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-lg font-bold" style={{ color: brandColor }}>
                {t("currency_format", { value: item.price })}
              </p>
              {qtyInCart > 0 ? (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onDecrease}
                    className="p-2 aspect-square rounded-full"
                    aria-label={t("menu.decrease_quantity")}
                  >
                    -
                  </Button>
                  <span className="font-medium w-5 text-center">{qtyInCart}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onIncrease}
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
              )}
            </div>
          </Card>
        </div>
      </motion.div>
  );
}
