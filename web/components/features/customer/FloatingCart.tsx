"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  count: number;
  total: number;
  onCheckout: () => void;
  brandColor: string;
}

export function FloatingCart({ count, total, onCheckout, brandColor }: Props) {
  const t = useTranslations("Customer");
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 z-20 p-1 mt-8">
      <Card
        className="max-w-md mx-auto shadow-xl backdrop-blur-md bg-opacity-80 dark:bg-opacity-80"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex justify-between items-center text-white">
          <div>
            <p className="font-semibold">
              {t("cart.items_in_cart_plural", { count })}
            </p>
            <p className="text-sm">
              {t("common.total")}: {t("currency_format", { value: total })}
            </p>
          </div>
          <Button
            onClick={onCheckout}
            className="bg-white hover:bg-slate-100"
            style={{ color: brandColor }}
          >
            {t("cart.checkout_button")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
