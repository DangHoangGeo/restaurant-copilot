import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MenuClientContent } from './menu-client-content';
import { headers } from 'next/headers';
import { getSubdomainFromHost } from '@/lib/utils';
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings';

export default async function MenuPage({ 
  params
}: { 
	params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'AdminMenu' });
  
  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  let restaurantId: string | null = null;

  if (subdomain) {
    restaurantId = await getRestaurantIdFromSubdomain(subdomain);
  }

  if (!restaurantId) {
    return <MenuClientContent initialData={null} error={t('errors.restaurant_not_found')} />;
  }

  try {
    // Construct the full URL for the API call
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const apiUrl = `${baseUrl}/api/v1/categories`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch categories');
    }

    const { categories } = await response.json();

    if (!categories || categories.length === 0) {
      return <MenuClientContent initialData={null} error={t('errors.no_categories_found')} />;
    }

    return (
      <MenuClientContent 
        initialData={categories} 
        error={null}
      />
    );
  } catch (error) {
    console.error("Error fetching menu data:", error);
    return <MenuClientContent initialData={null} error={t('errors.data_fetch_error')} />;
  }
}
