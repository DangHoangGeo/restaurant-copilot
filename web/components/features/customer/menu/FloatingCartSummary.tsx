"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
// import { useCart } from "@/hooks/use-cart"; // Assuming useCart hook exists
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils/currency"; // Assuming this utility exists

// Placeholder for useCart hook
const useCart = () => ({
  totalCartItems: Math.floor(Math.random() * 5) + 1, // Random items for placeholder
  totalCartPrice: Math.random() * 10000, // Random price for placeholder
});


interface FloatingCartSummaryProps {
  restaurantPrimaryColor: string;
}

export default function FloatingCartSummary({
  restaurantPrimaryColor,
}: FloatingCartSummaryProps) {
  const t = useTranslations("CustomerMenu");
  const locale = useLocale();
  const { totalCartItems, totalCartPrice } = useCart();

  if (totalCartItems === 0) {
    return null;
  }

  // Determine text color based on primary color brightness
  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const buttonTextColor = getTextColor(restaurantPrimaryColor);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 p-4 border-t"
      style={{ backgroundColor: restaurantPrimaryColor }}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div style={{ color: buttonTextColor }}>
          <p className="text-lg font-semibold">
            {totalCartItems} {totalCartItems === 1 ? t("item") : t("items")}
          </p>
          <p className="text-xl font-bold">
            {formatCurrency(totalCartPrice, "JPY", locale)} {/* TODO: Use actual currency */}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shadow-md"
          style={{
            backgroundColor: buttonTextColor, // Button background is text color
            color: restaurantPrimaryColor,    // Button text is primary color
          }}
        >
          <Link href={`/${locale}/customer/checkout`}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            {t("checkout")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
