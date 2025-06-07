import React from "react";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"; // Adjusted path
import SettingsForm from "./settings-form";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Adjusted path
import { AlertTriangle } from "lucide-react";
import { headers } from 'next/headers';
import { getSubdomainFromHost } from "@/lib/utils";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";

// TODO: The restaurant logo can be stored in Supabase Storage for now.
// Consider using api/v1/restaurant/settings/route.ts for API interactions
// also other fileds like social links, timezone, etc. can be added later.

export type Restaurant = {
  id: string;
  name: string | null;
  default_language: "en" | "ja" | "vi" | null;
  brand_color: string | null;
  contact_info: string | null;
  address: string | null;
  opening_hours: string | null;
  description: string | null;
  logo_url: string | null;
  // ensure all fields expected by SettingsForm are here
  subdomain?: string | null; // Add if needed, based on table structure
  created_at?: string | null; // Add if needed
  updated_at?: string | null; // Add if needed
  user_id?: string | null; // Add if needed
};


export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  const user = await getUserFromRequest();
  if (user && user.subdomain !== subdomain) {
    errorGettingId = t("Settings.Page.errors.noSubdomainDetected");
  } 
  restaurantId = user?.restaurantId || null;
  let initialSettings: Restaurant | null = null;
  let fetchError: string | null = null;
  if (user && user.restaurantId) {
    try {
      const supabase = await createSupabaseServerClient(); // Use default role unless admin rights are explicitly needed for this read
      const { data, error } = await supabase
        .from("restaurants")
        .select("*") // Select all fields
        .eq("id", user.restaurantId)
        .single();

      if (error) {
        console.error(`Error fetching restaurant settings for ID "${user.restaurantId}":`, error);
        throw error;
      }
      initialSettings = data as Restaurant; // Type assertion
      if (!initialSettings) {
        fetchError = t("errors.noSettingsFoundMessage"); // No data returned for a valid ID
      }
    } catch (error) {
      console.error("Error fetching restaurant settings:", error);
      fetchError = (error instanceof Error ? error.message : t("errors.fetchErrorMessage"));
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("Settings.Page.title")}
        </h1>
      </header>

      {errorGettingId && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
         // This case should ideally be covered by errorGettingId if subdomain was present but no ID found
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{t("errors.noRestaurantIdMessage")}</AlertDescription>
        </Alert>
      )}

      {restaurantId && fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && !fetchError && !initialSettings && (
        // This means ID was found, no DB error, but no record (might have been deleted between ID fetch and settings fetch)
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>{t("errors.noSettingsFoundMessage")}</AlertDescription>
        </Alert>
      )}

      {restaurantId && initialSettings && !fetchError && (
        <SettingsForm
          initialSettings={initialSettings}
          locale={locale}
        />
      )}
    </div>
  );
}
