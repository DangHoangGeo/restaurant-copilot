import React from "react";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server"; // Adjusted path
import SettingsForm from "./settings-form";
import { getTranslations } from "next-intl/server";
import { getRestaurantIdFromSubdomain } from "@/lib/server/restaurant-settings"; // Adjusted path
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Adjusted path
import { AlertTriangle } from "lucide-react";

// This type should match the prop type expected by SettingsForm
// and the data structure returned by the 'restaurants' table.
type Restaurant = {
  id: string;
  name: string | null;
  default_language: "en" | "ja" | "vi" | null;
  brand_color: string | null;
  contact_info: string | null;
  address: string | null;
  hours: string | null;
  description: string | null;
  logo_url: string | null;
  // ensure all fields expected by SettingsForm are here
  subdomain?: string | null; // Add if needed, based on table structure
  created_at?: string | null; // Add if needed
  updated_at?: string | null; // Add if needed
  user_id?: string | null; // Add if needed
};

interface SettingsPageProps {
  params: {
    locale: string;
    // Potentially other params like a restaurantId if routing changes
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const locale = params.locale as string;
  const t = await getTranslations({ locale, namespace: "Dashboard.Settings.Page" });

  // TODO: Implement robust subdomain extraction from request headers (e.g., in middleware or a dedicated utility)
  // For now, this is a placeholder. In a real app, you might get it from `headers()` or a middleware-populated prop.
  const currentSubdomain = "your-test-subdomain"; // Placeholder - replace with actual subdomain retrieval logic

  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;

  if (!currentSubdomain) {
    errorGettingId = t("errors.noSubdomainDetected");
  } else {
    try {
      restaurantId = await getRestaurantIdFromSubdomain(currentSubdomain);
      if (!restaurantId) {
        errorGettingId = t("errors.noRestaurantIdForSubdomain", { subdomain: currentSubdomain });
      }
    } catch (error) {
      console.error(`Error getting restaurant ID for subdomain "${currentSubdomain}":`, error);
      errorGettingId = t("errors.genericRestaurantIdError");
    }
  }

  let initialSettings: Restaurant | null = null;
  let fetchError: string | null = null;

  if (restaurantId) {
    try {
      const supabase = createSupabaseServerClient(); // Use default role unless admin rights are explicitly needed for this read
      const { data, error } = await supabase
        .from("restaurants")
        .select("*") // Select all fields
        .eq("id", restaurantId)
        .single();

      if (error) {
        console.error(`Error fetching restaurant settings for ID "${restaurantId}":`, error);
        throw error;
      }
      initialSettings = data as Restaurant; // Type assertion
      if (!initialSettings) {
        fetchError = t("errors.noSettingsFoundMessage"); // No data returned for a valid ID
      }
    } catch (error: any) {
      console.error("Error fetching restaurant settings:", error);
      fetchError = error.message || t("errors.fetchErrorMessage");
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
          <AlertTitle>{t("errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
         // This case should ideally be covered by errorGettingId if subdomain was present but no ID found
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{t("errors.noRestaurantIdMessage")}</AlertDescription>
        </Alert>
      )}

      {restaurantId && fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && !fetchError && !initialSettings && (
        // This means ID was found, no DB error, but no record (might have been deleted between ID fetch and settings fetch)
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>{t("errors.noSettingsFoundMessage")}</AlertDescription>
        </Alert>
      )}

      {restaurantId && initialSettings && !fetchError && (
        <SettingsForm initialSettings={initialSettings} locale={locale} />
      )}
    </div>
  );
}
