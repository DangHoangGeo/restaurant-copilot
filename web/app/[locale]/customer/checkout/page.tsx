import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
import CheckoutClientForm from "./checkout-client-form";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';

export default async function CheckoutPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = host?.split(".")[0] || null;
  // Fallback for development
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app')
    ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default"
    : subdomain;

  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.log(`Restaurant settings not found for subdomain: ${effectiveSubdomain} on checkout page`);
    return notFound(); // Or handle with a specific error page
  }

  const cookieStore = cookies();
  const sessionId = cookieStore.get("customer_session_id")?.value || null;

  if (!sessionId) {
    // No active session, redirect to menu page or a specific error page
    // It's possible the menu page itself handles session creation if tableId is lost
    // For checkout, a session is strictly required.
    console.log("No session ID found in cookies, redirecting to customer menu.");
    redirect(`/${locale}/customer`);
  }

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'CheckoutPage', 'Common')}>
      <div className="container py-8 md:py-12">
        <CheckoutClientForm
          restaurantSettings={restaurantSettings}
          initialSessionId={sessionId}
        />
      </div>
    </NextIntlClientProvider>
  );
}
