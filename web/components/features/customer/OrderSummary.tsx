"use client";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export interface SummaryItem {
  itemId: string;
  name: string; // Changed from MenuItem to string
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
  isAdjustable?: boolean; // New prop
  onIncreaseQuantity?: (itemId: string) => void;
  onDecreaseQuantity?: (itemId: string) => void;
  onSetQuantity?: (itemId: string, quantity: number) => void;
}

export function OrderSummary({
  items,
  total,
  locale,
  showImages = true,
  className,
  isAdjustable = true, // Default to true
  onIncreaseQuantity,
  onDecreaseQuantity,
  onSetQuantity,
}: Props) {
  const t = useTranslations("Customer");

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (!onSetQuantity || newQuantity < 0) return;
    onSetQuantity(itemId, newQuantity);
  };

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
                alt={item.name} // Now item.name is already a string
                className="w-12 h-10 object-cover rounded mr-3"
              />
            )}
            <div>
              <p className="font-medium">
                {item.name} {/* Now item.name is already a string */}
              </p>
              {isAdjustable ? (
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => onDecreaseQuantity?.(item.itemId)}
                    className="px-2 py-0.5 border rounded-md mr-2 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("checkout.decrease_quantity")}
                    disabled={!onDecreaseQuantity}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleQuantityChange(item.itemId, parseInt(e.target.value, 10))}
                    className="w-10 text-center border rounded-md dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-700"
                    aria-label={t("checkout.quantity")}
                    disabled={!onSetQuantity}
                  />
                  <button
                    onClick={() => onIncreaseQuantity?.(item.itemId)}
                    className="px-2 py-0.5 border rounded-md ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("checkout.increase_quantity")}
                    disabled={!onIncreaseQuantity}
                  >
                    +
                  </button>
                  <span className="ml-2">x {t("currency_format", { value: item.price })}</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("checkout.quantity_short")} {item.qty} x {t("currency_format", { value: item.price })}
                </p>
              )}
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
