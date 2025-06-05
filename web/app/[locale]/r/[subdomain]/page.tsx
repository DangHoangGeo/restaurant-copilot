import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';

import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
// Assuming these server helper functions will be created or already exist in a suitable location
import { getMenuDataForRestaurant } from "@/lib/server/menu-data";
import { createOrRetrieveSessionOnPageLoad } from "@/lib/server/session-handler";

import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import FloatingActionButtons from "@/components/features/customer/floating-action-buttons";
import MenuClientContent from "@/app/[locale]/customer/menu-client-content"; // Re-using the client content from the /customer route

// Define structure for session data expected by MenuClientContent
interface SessionData {
  sessionId: string;
  tableId: string;
  status: "new" | "open" | "pending_payment" | "completed" | "canceled" | "expired";
}


export default async function SubdomainRootPage({
  params: { locale, subdomain },
  searchParams,
}: {
  params: { locale: string; subdomain: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Fetch restaurant settings based on the subdomain from URL params
  const restaurantSettings = await getRestaurantSettingsFromSubdomain(subdomain);

  if (!restaurantSettings) {
    console.log(`SubdomainRootPage: Restaurant settings not found for subdomain: ${subdomain}`);
    return notFound();
  }

  // Fetch menu data for the restaurant
  // Assuming getMenuDataForRestaurant handles localization and filtering internally
  const todayWeekday = new Date().getDay(); // 0 for Sunday, 1 for Monday, etc.
  const initialMenuData = await getMenuDataForRestaurant(
    restaurantSettings.id,
    locale,
    todayWeekday // Pass today's weekday for filtering menu items
  );

  // Handle session creation/retrieval if tableId is present
  let initialSessionData: SessionData | null = null;
  const tableId = searchParams?.tableId as string | undefined;

  if (tableId) {
    // This server helper should encapsulate the logic from the old /customer page:
    // - Call session creation API or directly interact with DB.
    // - Potentially set a cookie (though direct cookie setting in RSCs needs care, might be better in API/middleware).
    // - For this page, it might just return session details.
    // The API call to /api/v1/sessions/create needs the full host, so direct DB interaction might be cleaner here.
    const sessionResult = await createOrRetrieveSessionOnPageLoad(restaurantSettings.id, tableId, cookies());
    if (sessionResult) {
        initialSessionData = sessionResult;
    }
  }

  const messages = useMessages();

  // Placeholder for cart item count - actual count would come from a client component using cart context
  const cartItemCount = 0;

  return (
    <NextIntlClientProvider
        locale={locale}
        messages={pick(messages, 'CustomerLayout', 'CustomerMenu', 'Common', 'StarRating', 'AIChatWidget', 'LanguageSwitcher')}
    >
      <div className="flex flex-col min-h-screen">
        <CustomerHeader
          restaurantSettings={restaurantSettings}
          cartItemCount={cartItemCount}
        />
        <main className="flex-grow container py-6 md:py-10">
          {/*
            MenuClientContent is designed to show menu items.
            It was previously used in /customer/page.tsx.
            We are reusing it here for the subdomain root.
          */}
          <MenuClientContent
            initialMenuData={initialMenuData || []}
            initialSessionData={initialSessionData}
            restaurantSettings={restaurantSettings}
            // locale={locale} // locale is implicitly available via NextIntlClientProvider context
          />
        </main>
        <CustomerFooter restaurantSettings={restaurantSettings} />
        <FloatingActionButtons restaurantPrimaryColor={restaurantSettings.primaryColor} />
      </div>
    </NextIntlClientProvider>
  );
}
