import { ProtectedLayout } from '@/components/ProtectedLayout';
import { AdminLayoutClient } from './admin-layout-client';
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { redirect } from 'next/navigation';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('admin_dashboard_title'),
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const user = await getUserFromRequest();
  const resolvedParams = await params;
  const locale = resolvedParams.locale || 'en';
  if (!user) {
    redirect(`/${locale}/login`);
  }
  const headersList = await headers();
  const host = headersList.get("host") || "";
  let subdomain = null;
  const parts = host.split('.');
	// Determine root domain parts for production and handle localhost in development
	let rootDomainParts = (process.env.NEXT_PUBLIC_PRODUCTION_URL || 'coorder.ai').split('.').length;
	// If running on localhost, treat 'localhost' as the root domain
	if (host.includes('localhost')) {
		rootDomainParts = 1; // 'abc.localhost:3000' => ['abc', 'localhost:3000']
	}
	if (parts.length > rootDomainParts) {
		subdomain = parts[0];
	}

  if (!subdomain) {
    // This scenario should be handled by middleware redirecting to a selection page
    // console.log("locale:", locale); // Dev log
    // console.error("DashboardLayout: Subdomain could not be determined from host:", host); // Production: use proper logging
  }
  
  const restaurantSettings = subdomain 
    ? await getRestaurantSettingsFromSubdomain(subdomain) 
    : null;
  
  const tErrors = await getTranslations({ locale, namespace: 'Dashboard.Layout.errors' });

  if (!restaurantSettings && subdomain) {
    // console.warn(`No restaurant settings found for subdomain: ${subdomain}`); // Production: use proper logging
    const MOCK_RESTAURANT_INFO_FALLBACK = {
      name: tErrors('fallbackRestaurantName'), // Use a translated fallback name
      logoUrl: null,
      subdomain: subdomain,
      primaryColor: '#3B82F6', // Default Tailwind blue
    } as const;
    return (
      <ProtectedLayout>
        <AdminLayoutClient locale={locale} restaurantSettings={MOCK_RESTAURANT_INFO_FALLBACK}>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">{tErrors('configurationErrorTitle')}</h1>
            <p className="text-muted-foreground">{tErrors('configurationErrorDescription', { subdomain: subdomain })}</p>
            {/* It might be better to not render children here, or show a more specific error page */}
            {/* {children} */}
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }
  
  if (!restaurantSettings && !subdomain) {
     // This case implies accessing dashboard on root domain, which might be invalid for some setups
     const GENERIC_ADMIN_SETTINGS = {
        name: tErrors('adminPanelTitle'), // Use a translated title
        logoUrl: null,
        subdomain: "admin", // or a generic placeholder
        primaryColor: '#3B82F6',
      } as const;
    return (
      <ProtectedLayout>
        <AdminLayoutClient locale={locale} restaurantSettings={GENERIC_ADMIN_SETTINGS}>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">{tErrors('noRestaurantContextTitle')}</h1>
            <p className="text-muted-foreground">{tErrors('noRestaurantContextDescription')}</p>
             {/* It might be better to not render children here, or show a more specific error page */}
            {/* {children} */}
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  // At this point restaurantSettings is guaranteed to be non-null if we reach here (or handled above)
  // The `!` assertion is okay if the logic above correctly handles all null cases for restaurantSettings.
  return (
    <ProtectedLayout>
      <AdminLayoutClient locale={locale} restaurantSettings={restaurantSettings!}>
        {children}
      </AdminLayoutClient>
    </ProtectedLayout>
  );
}