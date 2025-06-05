import { ProtectedLayout } from '@/components/ProtectedLayout';
import { AdminLayoutClient } from './admin-layout-client';
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string }}) {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('admin_dashboard_title'),
  };
}

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
  params?: { locale: string };
}) {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  let subdomain = null;
  const parts = host.split('.');
  const rootDomainParts = (process.env.NEXT_PRIVATE_PRODUCTION_URL || 'qorder.jp').split('.').length;
  if (parts.length > rootDomainParts) {
    subdomain = parts[0];
  }

  if (!subdomain) {
    // This scenario should be handled by middleware redirecting to a selection page
    console.error("DashboardLayout: Subdomain could not be determined from host:", host);
  }
  
  const restaurantSettings = subdomain 
    ? await getRestaurantSettingsFromSubdomain(subdomain) 
    : null;

  if (!restaurantSettings && subdomain) {
    console.warn(`No restaurant settings found for subdomain: ${subdomain}`);
    const MOCK_RESTAURANT_INFO_FALLBACK = {
      name: "Fallback Restaurant",
      logoUrl: null,
      subdomain: subdomain,
      primaryColor: '#3B82F6', // Default Tailwind blue
    } as const;
    return (
      <ProtectedLayout>
        <AdminLayoutClient restaurantSettings={MOCK_RESTAURANT_INFO_FALLBACK}>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">Restaurant Configuration Error</h1>
            <p className="text-muted-foreground">Could not load settings for subdomain: {subdomain}. Displaying with fallback.</p>
            {children}
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }
  
  if (!restaurantSettings && !subdomain) {
     // This case implies accessing dashboard on root domain
     const GENERIC_ADMIN_SETTINGS = {
        name: "Admin Panel",
        logoUrl: null,
        subdomain: "admin",
        primaryColor: '#3B82F6',
      } as const;
    return (
      <ProtectedLayout>
        <AdminLayoutClient restaurantSettings={GENERIC_ADMIN_SETTINGS}>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">Error: No Restaurant Context</h1>
            <p className="text-muted-foreground">This dashboard requires a restaurant subdomain.</p>
            {children}
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  // At this point restaurantSettings is guaranteed to be non-null if we reach here
  return (
    <ProtectedLayout>
      <AdminLayoutClient restaurantSettings={restaurantSettings!}>
        {children}
      </AdminLayoutClient>
    </ProtectedLayout>
  );
}