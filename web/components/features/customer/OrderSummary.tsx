"use client";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "./utils";

export interface SummaryItem {
  itemId: string;
  name: Record<string, unknown> | string;
  price: number;
  qty: number;
  imageUrl?: string;
}

interface Props {
  items: SummaryItem[];
  total: number;
  locale: string;
  showImages?: boolean;
  className?: string;
}

export function OrderSummary({ items, total, locale, showImages = true, className }: Props) {
  const t = useTranslations("Customer");
  return (
    <Card className={className ?? "p-4"}>
      <h3 className="text-lg font-semibold mb-3">{t("checkout.order_summary")}</h3>
      {items.map((item) => (
        <div
          key={item.itemId}
          className="flex items-center justify-between py-2 border-b last:border-b-0 dark:border-slate-700"
        >
          <div className="flex items-center">
            {showImages && (
              <img
                src={item.imageUrl || "https://placehold.co/60x40/E2E8F0/334155?text=Item"}
                alt={getLocalizedText(item.name as Record<string, unknown>, locale)}
                className="w-12 h-10 object-cover rounded mr-3"
              />
            )}
            <div>
              <p className="font-medium">
                {getLocalizedText(item.name as Record<string, unknown>, locale)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {item.qty} x {t("currency_format", { value: item.price })}
              </p>
            </div>
          </div>
          <p className="font-semibold">{t("currency_format", { value: item.price * item.qty })}</p>
        </div>
      ))}
      <div className="flex justify-between text-lg font-bold mt-4 pt-2 border-t dark:border-slate-700">
        <span>{t("common.total")}:</span>
        <span>{t("currency_format", { value: total })}</span>
      </div>
    </Card>
  );
}
