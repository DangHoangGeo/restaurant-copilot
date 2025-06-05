import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tables as dbTables, menuItems as dbMenuItems } from "@/lib/db/schema"; // Ensure correct schema imports
import { eq, and, asc } from "drizzle-orm";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
import { getLocaleName } from "@/lib/utils/locale";
import BookingForm from "./booking-form";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';

// Placeholder for FEATURE_FLAGS - In a real app, import this from a config file
const FEATURE_FLAGS = {
  tableBooking: true, // Set to false to disable booking globally
  preOrder: true,     // Set to false to disable pre-ordering on booking page
};

// Define types for what BookingForm expects
interface TableForForm {
  id: string;
  name: string; // Localized name
  capacity: number;
}

interface MenuItemForForm {
  id: string;
  name: string; // Localized name
  price: number;
  // currencyCode: string; // This will come from restaurantSettings.currency
}


export default async function BookingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!FEATURE_FLAGS.tableBooking) {
    console.log("Booking Page: Table booking feature is disabled.");
    return notFound(); // Or redirect to a "feature unavailable" page
  }

  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = host?.split(".")[0] || null;
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app')
    ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default"
    : subdomain;

  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.warn(`Booking Page: Restaurant settings not found for subdomain: ${effectiveSubdomain}`);
    return notFound();
  }

  // Fetch available tables for the restaurant
  const tablesData = await db.query.dbTables.findMany({
    where: eq(dbTables.restaurantId, restaurantSettings.id),
    columns: {
      id: true,
      // Assuming localized names are stored directly in the tables table
      // Adjust these to your actual column names: name_en, name_ja, name_vi
      name_en: true,
      name_ja: true,
      name_vi: true,
      capacity: true,
      // isActive: true, // Consider fetching only active tables
    },
    orderBy: [asc(dbTables.name_en)], // Example ordering
  });

  const availableTables: TableForForm[] = tablesData
    // .filter(table => table.isActive) // Optional: filter for active tables
    .map(table => {
        const tableNameObj: Record<string, string> = {};
        if (table.name_en) tableNameObj['en'] = table.name_en;
        if (table.name_ja) tableNameObj['ja'] = table.name_ja;
        if (table.name_vi) tableNameObj['vi'] = table.name_vi;
        return {
            id: table.id,
            name: getLocaleName(tableNameObj, locale) || `Table ${table.id.substring(0,4)}`, // Fallback name
            capacity: table.capacity,
        }
    });

  // Fetch menu items available for pre-order
  let menuItemsForPreorder: MenuItemForForm[] = [];
  if (FEATURE_FLAGS.preOrder) {
    const menuItemsData = await db.query.dbMenuItems.findMany({
      where: and(
        eq(dbMenuItems.restaurantId, restaurantSettings.id),
        eq(dbMenuItems.available, true) // Only available items
        // TODO: Consider weekday_visibility if pre-orders depend on it
      ),
      columns: {
        id: true,
        name_en: true,
        name_ja: true,
        name_vi: true,
        price: true,
      },
      orderBy: [asc(dbMenuItems.name_en)],
    });
    menuItemsForPreorder = menuItemsData.map(item => {
        const itemNameObj: Record<string, string> = {};
        if (item.name_en) itemNameObj['en'] = item.name_en;
        if (item.name_ja) itemNameObj['ja'] = item.name_ja;
        if (item.name_vi) itemNameObj['vi'] = item.name_vi;
        return {
            id: item.id,
            name: getLocaleName(itemNameObj, locale) || "Menu Item", // Fallback name
            price: item.price,
        }
    });
  }

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'BookingPage', 'Common')}>
      <div className="container py-8 md:py-12">
        <BookingForm
          availableTables={availableTables}
          menuItemsForPreorder={menuItemsForPreorder}
          restaurantPrimaryColor={restaurantSettings.primaryColor}
          restaurantCurrency={restaurantSettings.currency}
          locale={locale}
        />
      </div>
    </NextIntlClientProvider>
  );
}
