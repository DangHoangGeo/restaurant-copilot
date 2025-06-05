import { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import FloatingActionButtons from "@/components/features/customer/floating-action-buttons";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant"; // Assuming this function exists
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';

// Placeholder for CartButton - this would typically be a client component
// using a cart context (e.g., useCart())
const CartButtonClientWrapper = () => {
  // const { itemCount } = useCart(); // Example usage
  const itemCount = 0; // Placeholder until cart context is implemented
  return <>{itemCount}</>; // Pass itemCount to CustomerHeader or render badge directly
};


export default async function CustomerLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const headersList = headers();
  const host = headersList.get("host");
  // TODO: Implement a robust way to extract subdomain
  // For now, assuming format like "subdomain.domain.com" or "subdomain.localhost:3000"
  const subdomain = host?.split(".")[0] || null;

  if (!subdomain) {
    // This case might happen on direct IP access or unexpected host format
    console.warn("Subdomain could not be determined from host:", host);
    // Potentially redirect to a central discovery page or show a generic error
    // For now, let's proceed with a default or error out
    // return notFound(); // Or handle differently
  }

  // Fallback for development when subdomain might be 'localhost' or not present as expected
  // In a real scenario, ensure subdomain extraction is robust.
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app') ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default" : subdomain;


  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.log(`Restaurant settings not found for subdomain: ${effectiveSubdomain}`);
    return notFound();
  }

  // For <CustomerHeader cartItemCount={...} />
  // We need a client component that uses useCart() hook to get the cart item count.
  // This layout is a server component, so we can't use hooks directly.
  // A common pattern is to create a small client component wrapper.
  // For now, we'll pass a placeholder value.
  // In a real app, CartButtonClientWrapper would be a client component.
  const cartItemCount = 0; // Placeholder, replace with actual cart count via client component

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'CustomerLayout', 'LanguageSwitcher')}>
      <div className="flex flex-col min-h-screen">
        <CustomerHeader
          restaurantSettings={restaurantSettings}
          cartItemCount={cartItemCount} // This will be updated once CartButtonClientWrapper is implemented
        />
        <main className="flex-grow container py-6 md:py-10">{children}</main>
        <CustomerFooter restaurantSettings={restaurantSettings} />
        <FloatingActionButtons restaurantPrimaryColor={restaurantSettings.primaryColor} />
      </div>
    </NextIntlClientProvider>
  );
}
