"use client";

import { useSearchParams, useParams } from "next/navigation";

export function useRestaurantContext() {
  const searchParams = useSearchParams();
  const params = useParams();

  // Assuming restaurant is passed as a query parameter e.g. /dashboard?restaurant=myresto
  // Or it could be part of the hostname in a multi-tenant setup, which is more complex
  // For this example, let's stick to query params or a default.
  const restaurant = searchParams.get("restaurant") || null;

  // Locale can be from path params or search params.
  // If your routing is /:locale/dashboard, then params.locale will have it.
  // If it's a query param, e.g. /dashboard?locale=fr, then searchParams.get('locale')
  const locale = (params.locale as string) || searchParams.get("locale") || "en"; // Default to 'en'

  return {
    restaurant,
    locale,
  };
}
