"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import CategorySection from "@/components/features/customer/menu/CategorySection";
import FloatingCartSummary from "@/components/features/customer/menu/FloatingCartSummary";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// Placeholder types - these should be imported from a central types definition
interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  available: boolean;
  weekdayVisibility?: number[] | null;
}

interface CategoryData {
  id: string;
  name: string;
  items: MenuItemData[];
}

interface RestaurantSettings {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  phone?: string | null;
  address?: string | null;
  currency: string; // e.g., "JPY", "USD"
  // other settings
}

interface InitialSessionData {
  sessionId: string;
  tableId: string;
  status: "new" | "open" | "pending_payment" | "completed" | "canceled" | "expired"; // Example statuses
}

interface MenuClientContentProps {
  initialMenuData: CategoryData[];
  initialSessionData?: InitialSessionData | null;
  restaurantSettings: RestaurantSettings;
}

// Placeholder for FEATURE_FLAGS
const FEATURE_FLAGS = {
  tableBooking: true, // Example
};

export default function MenuClientContent({
  initialMenuData,
  initialSessionData,
  restaurantSettings,
}: MenuClientContentProps) {
  const t = useTranslations("CustomerMenu");
  const locale = useLocale();
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSessionData?.status === "expired") {
      setSessionMessage(t("sessionExpiredMessage"));
      // Potentially clear session cookie here if needed, or prompt user to rescan
    }
  }, [initialSessionData, t]);

  const today = new Date();
  const todayWeekday = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6

  return (
    <div className="pb-24"> {/* Padding at bottom to avoid overlap with FloatingCartSummary */}
      {sessionMessage && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("sessionStatusTitle")}</AlertTitle>
          <AlertDescription>{sessionMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-0">
          {t("menuTitle")}
        </h1>
        {FEATURE_FLAGS.tableBooking && (
          <Button variant="outline" asChild style={{borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor}}>
            <Link href={`/${locale}/customer/booking`}>{t("bookTableButton")}</Link>
          </Button>
        )}
      </div>

      {/* TODO: Add filters and sorting options here if needed */}

      {initialMenuData && initialMenuData.length > 0 ? (
        <div className="space-y-8">
          {initialMenuData.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              todayWeekday={todayWeekday}
              restaurantPrimaryColor={restaurantSettings.primaryColor}
              restaurantSecondaryColor={restaurantSettings.secondaryColor || undefined}
            />
          ))}
        </div>
      ) : (
        <p>{t("noMenuItems")}</p> // Message when no categories/items are available
      )}

      <FloatingCartSummary restaurantPrimaryColor={restaurantSettings.primaryColor} />
    </div>
  );
}
