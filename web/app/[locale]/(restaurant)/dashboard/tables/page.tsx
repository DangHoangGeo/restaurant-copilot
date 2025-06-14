import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { TablesClientContent } from './tables-client-content'
import { getTranslations } from 'next-intl/server'
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Table } from '@/shared/types/';

export default async function TablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const t = await getTranslations({ locale, namespace: 'AdminTables' })
  const tCommon = await getTranslations({ locale, namespace: 'Common' });
  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  const user = await getUserFromRequest();
  if (user && user.subdomain !== subdomain) {
    errorGettingId = tCommon("errors.noSubdomainDetected");
  }
  restaurantId = user?.restaurantId || null;

  let initialData: Table[] = [];
  let fetchError: string | null = null;
  let restaurantSettings: { name: string; logoUrl: string | null } | null = null;

  if (user && user.restaurantId) {
    try {
      
      // Fetch restaurant settings
      const { data: restaurantData, error: restaurantError } = await supabaseAdmin
        .from("restaurants")
        .select("name, logo_url")
        .eq("id", user.restaurantId)
        .single();

      if (restaurantError) {
        console.error(`Error fetching restaurant settings for ID "${user.restaurantId}":`, restaurantError);
        throw restaurantError;
      }
      if (restaurantData) {
        restaurantSettings = {
          name: restaurantData.name || 'Restaurant',
          logoUrl: restaurantData.logo_url
        };
      }

      // Fetch tables data
      const { data: tablesData, error: tablesError } = await supabaseAdmin
        .from("tables")
        .select("*")
        .eq("restaurant_id", user.restaurantId);

      if (tablesError) {
        console.error(`Error fetching tables for restaurant ID "${user.restaurantId}":`, tablesError);
        throw tablesError;
      }
      
      initialData = tablesData as Table[];
      // No need to set fetchError for empty array - let client component handle empty state
    } catch (error) {
      console.error("Error fetching tables data:", error);
      fetchError = (error instanceof Error ? error.message : t("errors.data_fetch_error"));
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      {errorGettingId && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{tCommon("errors.noRestaurantIdMessage")}</AlertDescription>
        </Alert>
      )}

      {restaurantId && fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && !fetchError && restaurantSettings && (
        <TablesClientContent 
          initialData={initialData} 
          error={null}
          restaurantSettings={restaurantSettings}
        />
      )}
    </div>
  );
}
