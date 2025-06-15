import React from "react";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"; // Adjusted path
import SettingsForm from "./settings-form";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Adjusted path
import { AlertTriangle } from "lucide-react";
import { headers } from 'next/headers';
import { getSubdomainFromHost } from "@/lib/utils";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Restaurant } from "@/shared/types";
import { logger } from "@/lib/logger";

// TODO: The restaurant logo can be stored in Supabase Storage for now.
// Consider using api/v1/restaurant/settings/route.ts for API interactions
// also other fileds like social links, timezone, etc. can be added later.



export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  const user = await getUserFromRequest();
  if (user && user.subdomain !== subdomain) {
    errorGettingId = tCommon("errors.noSubdomainDetected");
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
        await logger.error('dashboard-settings', 'Error fetching restaurant settings for ID', {
          restaurantId: user.restaurantId,
          error: error.message
        }, user.restaurantId, user.userId);
        throw error;
      }
      initialSettings = data as Restaurant; // Type assertion
      if (!initialSettings) {
        fetchError = t("errors.noSettingsFoundMessage"); // No data returned for a valid ID
      }
    } catch (error) {
      await logger.error('dashboard-settings', 'Error fetching restaurant settings', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, user?.restaurantId, user?.userId);
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
          <AlertTitle>{tCommon("errors.noRestaurantIdTitle")}</AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
         // This case should ideally be covered by errorGettingId if subdomain was present but no ID found
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

      {restaurantId && !fetchError && !initialSettings && (
        // This means ID was found, no DB error, but no record (might have been deleted between ID fetch and settings fetch)
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>{tCommon("errors.noSettingsFoundMessage")}</AlertDescription>
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
