"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { getLocaleName } from "@/lib/utils/locale"; // Assuming this utility exists

// Placeholder types (should be imported from a central types definition)
interface MenuItem {
  id: string;
  // Assuming names are objects like { en: "Pizza", ja: "ピザ" }
  // The getLocaleName utility will pick the correct one.
  name: Record<string, string>;
  // other menu item fields if needed for display (e.g., image)
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  // unitPrice: number; // If needed to display individual prices
}

interface Order {
  id: string;
  orderItems: OrderItem[];
  totalAmount: number;
  tableId?: string | null; // Optional: if you want to display table number
  // currencyCode: string; // Should come from restaurantSettings
}

interface RestaurantSettings {
  id: string;
  name: string;
  currency: string; // e.g., "JPY", "USD"
  primaryColor: string;
  // other settings
}

interface ThankYouClientContentProps {
  order: Order;
  restaurantSettings: RestaurantSettings;
  locale: string;
}

// Placeholder for FEATURE_FLAGS
const FEATURE_FLAGS = {
  onlineReviews: true, // Example: Enable online reviews
};

export default function ThankYouClientContent({
  order,
  restaurantSettings,
  locale,
}: ThankYouClientContentProps) {
  const t = useTranslations("ThankYouPage");
  const tCommon = useTranslations("Common");

  return (
    <div className="max-w-xl mx-auto text-center">
      <CheckCircle2
        className="mx-auto mb-6 h-20 w-20"
        style={{ color: restaurantSettings.primaryColor }}
      />
      <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("title")}</h1>
      <p className="text-lg text-muted-foreground mb-8">
        {t("orderPlacedMessage")}
      </p>

      <div className="bg-muted p-6 rounded-lg mb-8 text-left shadow">
        <h2 className="text-xl font-semibold mb-4" style={{color: restaurantSettings.primaryColor}}>{t("orderSummaryTitle")}</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">{t("orderIdLabel")}</span>
            <span className="font-mono text-sm">{order.id}</span>
          </div>
          {order.tableId && (
            <div className="flex justify-between">
              <span className="font-medium">{t("tableIdLabel", { tableId: order.tableId })}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-medium">{t("totalAmountLabel")}</span>
            <span className="font-bold">
              {formatCurrency(order.totalAmount, restaurantSettings.currency, locale)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-left mb-8">
        <h3 className="text-lg font-semibold mb-3" style={{color: restaurantSettings.primaryColor}}>{t("orderedItemsTitle")}</h3>
        <ul className="space-y-2">
          {order.orderItems.map((item, index) => (
            <li key={index} className="p-3 border rounded-md flex justify-between items-center">
              <div>
                <span className="font-medium">
                  {getLocaleName(item.menuItem.name, locale) || tCommon("unknown_item")}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({t("quantityLabel")} {item.quantity})
                </span>
              </div>
              {FEATURE_FLAGS.onlineReviews && (
                <Button variant="outline" size="sm" asChild style={{borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor}}>
                  <Link href={`/${locale}/customer/review/${item.menuItem.id}`}>
                    <Star className="mr-2 h-4 w-4" />
                    {t("rateDishButton")}
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>


      <Button asChild size="lg" style={{backgroundColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor === '#ffffff' || restaurantSettings.primaryColor === 'white' ? 'black' : 'white'}}>
        <Link href={`/${locale}/customer`}>{t("backToMenuButton")}</Link>
      </Button>
    </div>
  );
}
