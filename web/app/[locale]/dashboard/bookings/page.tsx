import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { BookingsClientContent } from './bookings-client-content'
import { getTranslations } from 'next-intl/server'
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface PreOrderItem {
  itemId: string
  quantity: number
}

export interface Booking {
  id: string
  customerName: string
  contact: string
  date: string
  time: string
  partySize: number
  status: string
  preOrderItems: PreOrderItem[]
}

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
};

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const t = await getTranslations({ locale, namespace: 'AdminBookings' })

  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  const user = await getUserFromRequest();
  if (user && user.subdomain !== subdomain) {
    errorGettingId = t("Settings.Page.errors.noSubdomainDetected");
  } 
  restaurantId = user?.restaurantId || null;

  let initialBookings: Booking[] | null = null;
  let fetchError: string | null = null;
  let restaurantSettings: { name: string; logoUrl: string | null; subdomain?: string; primaryColor?: string; defaultLocale?: string; } | null = null;

  if (user && user.restaurantId) {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Fetch restaurant settings
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("name, logo_url, subdomain, brand_color, default_language")
        .eq("id", user.restaurantId)
        .single();

      if (restaurantError) {
        console.error(`Error fetching restaurant settings for ID "${user.restaurantId}":`, restaurantError);
        throw restaurantError;
      }
      if (restaurantData) {
        restaurantSettings = {
          name: restaurantData.name || 'Restaurant',
          logoUrl: restaurantData.logo_url,
          subdomain: restaurantData.subdomain || undefined,
          primaryColor: restaurantData.brand_color || undefined,
          defaultLocale: restaurantData.default_language || undefined,
        };
      }

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("restaurant_id", user.restaurantId);

      if (bookingsError) {
        console.error(`Error fetching bookings for restaurant ID "${user.restaurantId}":`, bookingsError);
        throw bookingsError;
      }
      
      initialBookings = bookingsData.map(b => ({
        id: b.id,
        customerName: b.customer_name,
        contact: b.contact_info,
        date: new Date(b.booking_time).toLocaleDateString(locale),
        time: new Date(b.booking_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        partySize: b.party_size,
        status: b.status,
        preOrderItems: b.pre_order_items || [] // Assuming pre_order_items is stored as JSONB
      })) as Booking[];

      if (!initialBookings || initialBookings.length === 0) {
        fetchError = t("errors.no_bookings_found");
      }
    } catch (error) {
      console.error("Error fetching bookings data:", error);
      fetchError = (error instanceof Error ? error.message : t("errors.data_fetch_error"));
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("Bookings.Page.title")}
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

      {restaurantId && initialBookings && !fetchError && restaurantSettings && (
        <BookingsClientContent 
          initialBookings={initialBookings} 
          restaurantSettings={restaurantSettings}
        />
      )}

      {restaurantId && !initialBookings && !fetchError && restaurantSettings && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>{t("errors.no_bookings_found")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
