import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRestaurantSettingsFromSubdomain } from "@/data/restaurant";
import { getMenuDataForRestaurant } from "@/data/menu"; // Assuming this function exists
import MenuClientContent from "./menu-client-content";
import { cookies } from "next/headers";
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { pick } from 'lodash';

// Define structure for session data based on API response
interface SessionApiResponse {
  sessionId?: string;
  error?: string;
}

// Define structure for order data (adjust based on your actual schema)
interface OrderData {
  id: string;
  sessionId: string;
  tableId: string;
  status: "new" | "open" | "pending_payment" | "completed" | "canceled" | "expired"; // Add other relevant statuses
  // other fields...
}

async function getSessionData(
  tableId: string,
  restaurantId: string,
  baseUrl: string
): Promise<{ sessionId: string; tableId: string; status: OrderData['status'] } | null> {
  try {
    // Construct the full API URL
    // In a server component, direct DB access might be preferred if API is on the same instance
    // But calling the API route ensures consistency if it contains complex logic or is external
    const apiUrl = `${baseUrl}/api/v1/sessions/create?tableId=${tableId}`;

    // The fetch request needs to pass along cookies if your middleware relies on them for auth/restaurant context
    // However, `getRestaurantIdFromMiddleware` in the API route should handle this.
    // For this call, we are a "client" to our own API.
    // Ensure the API route can determine restaurantId correctly (e.g., via its own middleware)
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        // If your API route's middleware for `getRestaurantIdFromMiddleware`
        // depends on host/subdomain, this might be tricky.
        // It's often better if such middleware can also work with an explicit restaurantId header if available,
        // or the session creation logic is directly in a server action/function.
        // For now, assuming the API route can resolve restaurantId.
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `Error creating/fetching session for table ${tableId}: ${response.status}`,
        errorData.error || "Unknown error"
      );
      return null;
    }

    const sessionResult = (await response.json()) as SessionApiResponse;

    if (sessionResult.error || !sessionResult.sessionId) {
      console.error("API returned error or no sessionId:", sessionResult.error);
      return null;
    }

    const { sessionId } = sessionResult;

    // Store sessionId in a cookie
    cookies().set("customer_session_id", sessionId, {
      path: "/",
      httpOnly: true, // Consider true if not needed by client-side JS directly
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Fetch the full order details to get the status (if API only returns sessionId)
    // Ideally, the session create API could return the full order object or at least status.
    // For now, assuming a direct DB call is feasible here for simplicity.
    // Replace with an API call if direct DB access is not appropriate from here.
    const { db } = await import("@/lib/db"); // Dynamic import for db
    const { orders } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const order = await db.query.orders.findFirst({
      where: eq(orders.sessionId, sessionId),
      columns: { status: true, tableId: true }, // Only fetch necessary columns
    });

    if (!order) {
      console.error(`Order not found for sessionId: ${sessionId}`);
      return null;
    }

    // Ensure tableId from order matches the input tableId for consistency
    if (order.tableId !== tableId) {
        console.warn(`Mismatch in tableId for session ${sessionId}. Expected ${tableId}, got ${order.tableId}`);
        // Handle this mismatch appropriately, maybe return null or an error state
    }

    return { sessionId, tableId: order.tableId, status: order.status as OrderData['status'] };
  } catch (error) {
    console.error("Failed to get session data:", error);
    return null;
  }
}

export default async function CustomerMenuPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = host?.split(".")[0] || null;
  // Fallback for development
  const effectiveSubdomain = (subdomain === 'localhost' || subdomain === null || subdomain === 'app') ? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SUBDOMAIN || "default" : subdomain;


  const restaurantSettings = await getRestaurantSettingsFromSubdomain(effectiveSubdomain);

  if (!restaurantSettings) {
    console.log(`Restaurant settings not found for subdomain: ${effectiveSubdomain} on page`);
    return notFound();
  }

  let initialSessionData: Awaited<ReturnType<typeof getSessionData>> = null;
  const tableId = searchParams?.tableId as string | undefined;

  if (tableId) {
    // Determine base URL for API calls
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    initialSessionData = await getSessionData(tableId, restaurantSettings.id, baseUrl);
  }

  // Fetch menu data - categories and items
  // Assuming getMenuDataForRestaurant fetches localized data based on current locale
  // and filters by availability and weekday visibility for today.
  const todayWeekday = new Date().getDay();
  const initialMenuData = await getMenuDataForRestaurant(
    restaurantSettings.id,
    locale,
    todayWeekday
  );

  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages, 'CustomerMenu', 'Common', 'StarRating')}>
      <MenuClientContent
        initialMenuData={initialMenuData || []} // Ensure it's always an array
        initialSessionData={initialSessionData}
        restaurantSettings={restaurantSettings}
      />
    </NextIntlClientProvider>
  );
}
