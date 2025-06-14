import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getSubdomainFromHost } from '@/lib/utils'
import { BookingsClientContent } from './bookings-client-content'
import { getTranslations } from 'next-intl/server'
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Booking } from '@/shared/types'


export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const host = (await headers()).get('host') || ''
  const subdomain = getSubdomainFromHost(host)
  const t = await getTranslations({ locale, namespace: 'AdminBookings' })
  const tCommon = await getTranslations({ locale, namespace: 'Common' })
  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  const user = await getUserFromRequest();
  if (user && user.subdomain !== subdomain) {
    errorGettingId = tCommon("errors.noSubdomainDetected");
  } 
  restaurantId = user?.restaurantId || null;

  let initialBookings: Booking[] = [];
  let fetchError: string | null = null;
  
  if (user && user.restaurantId) {
    try {
      const supabase = await createSupabaseServerClient();

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("restaurant_id", user.restaurantId);

      if (bookingsError) {
        // console.error(`Error fetching bookings for restaurant ID "${user.restaurantId}":`, bookingsError);
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

      // No need to set fetchError for empty array - let client component handle empty state
    } catch (error) {
      // console.error("Error fetching bookings data:", error);
      fetchError = (error instanceof Error ? error.message : t("errors.data_fetch_error")); // Use a generic data fetch error from AdminBookings
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
          <AlertTitle>{t("Settings.Page.errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && !fetchError && (
        <BookingsClientContent 
          initialBookings={initialBookings}
        />
      )}
    </div>
  );
}
