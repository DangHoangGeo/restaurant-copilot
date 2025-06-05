import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema"; // Ensure this is the correct schema import
import { eq, and } from "drizzle-orm";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
import { getLocaleName } from "@/lib/utils/locale";
import ReviewForm from "./review-form";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';
import { z } from 'zod';

// Placeholder for FEATURE_FLAGS - In a real app, import this from a config file
const FEATURE_FLAGS = {
  onlineReviews: true, // Set to false to disable reviews globally
};

// Validate UUID from params
const menuItemIdSchema = z.string().uuid("Invalid menu item ID format.");

export default async function ReviewPage({
  params: { locale, menuItemId: rawMenuItemId },
}: {
  params: { locale: string; menuItemId: string };
}) {
  if (!FEATURE_FLAGS.onlineReviews) {
    // Or redirect to a "feature unavailable" page or the main menu
    console.log("Review Page: Online reviews feature is disabled.");
    return notFound();
  }

  const menuItemIdValidation = menuItemIdSchema.safeParse(rawMenuItemId);
  if (!menuItemIdValidation.success) {
    console.warn("Review Page: Invalid menuItemId format from params.");
    return notFound();
  }
  const menuItemId = menuItemIdValidation.data;

  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = host?.split(".")[0] || null;
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app')
    ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default"
    : subdomain;

  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.warn(`Review Page: Restaurant settings not found for subdomain: ${effectiveSubdomain}`);
    return notFound();
  }

  // Fetch the menu item to ensure it exists for this restaurant and to get its name
  const menuItem = await db.query.menuItems.findFirst({
    where: and(
      eq(menuItems.id, menuItemId),
      eq(menuItems.restaurantId, restaurantSettings.id)
    ),
    columns: {
      // Assuming localized names are stored directly in the menuItems table
      // Adjust these to your actual column names: name_en, name_ja, name_vi
      name_en: true,
      name_ja: true,
      name_vi: true,
      // id: true, // already have menuItemId
    }
  });

  if (!menuItem) {
    console.warn(`Review Page: Menu item ${menuItemId} not found for restaurant ${restaurantSettings.id}.`);
    return notFound();
  }

  // Construct the name object for getLocaleName
  const menuItemNameObject: Record<string, string> = {};
  if (menuItem.name_en) menuItemNameObject['en'] = menuItem.name_en;
  if (menuItem.name_ja) menuItemNameObject['ja'] = menuItem.name_ja;
  if (menuItem.name_vi) menuItemNameObject['vi'] = menuItem.name_vi;

  const localizedMenuItemName = getLocaleName(menuItemNameObject, locale) || "Menu Item"; // Fallback name

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'ReviewPage', 'Common', 'StarRatingInput')}>
      <div className="container py-8 md:py-12">
        <ReviewForm
          menuItemId={menuItemId}
          menuItemName={localizedMenuItemName}
          restaurantPrimaryColor={restaurantSettings.primaryColor}
        />
      </div>
    </NextIntlClientProvider>
  );
}
