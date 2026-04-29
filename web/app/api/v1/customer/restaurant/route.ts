import { NextRequest, NextResponse } from "next/server";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";
import { cacheOrFetch } from "@/lib/server/cache";
import {
  CUSTOMER_RESTAURANT_META_TTL_SECONDS,
  customerRestaurantMetaCacheKey,
} from "@/lib/server/customer-cache";

type CustomerRestaurantPayload = {
  restaurant: {
    id: string;
    name: string;
    companyName?: string | null;
    logoUrl?: string | null;
    allowOrderNotes: boolean;
    subdomain: string;
    branchCode?: string | null;
    companyPublicSubdomain?: string | null;
    primaryColor?: string;
    defaultLocale: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    description_en?: string | null;
    description_ja?: string | null;
    description_vi?: string | null;
    opening_hours?: Record<string, string>;
    timezone?: string;
  };
};

/**
 * Customer API: Get restaurant data by subdomain
 * Used by customer-facing pages for progressive loading
 */
export async function GET(req: NextRequest) {
  try {
    const restaurantContext = await resolvePublicRestaurantContext({
      host: req.headers.get("host"),
      orgIdentifier: req.nextUrl.searchParams.get("org"),
      branchCode: req.nextUrl.searchParams.get("branch"),
      restaurantId: req.nextUrl.searchParams.get("restaurantId"),
      subdomain: req.nextUrl.searchParams.get("subdomain"),
    });

    if (!restaurantContext) {
      return NextResponse.json(
        {
          error: "Restaurant not found",
        },
        { status: 404 },
      );
    }

    const payload = await cacheOrFetch<CustomerRestaurantPayload>(
      customerRestaurantMetaCacheKey(restaurantContext.restaurant.id),
      async () => {
        const restaurant = restaurantContext.restaurant;

        return {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            companyName: restaurant.companyName,
            logoUrl: restaurant.logoUrl,
            allowOrderNotes: restaurant.allowOrderNotes ?? true,
            subdomain: restaurant.subdomain,
            branchCode: restaurant.branchCode,
            companyPublicSubdomain: restaurant.companyPublicSubdomain,
            primaryColor: restaurant.primaryColor,
            defaultLocale: restaurant.defaultLocale || "en",
            address: restaurant.address,
            phone: restaurant.phone,
            email: restaurant.email,
            website: restaurant.website,
            description_en: restaurant.description_en,
            description_ja: restaurant.description_ja,
            description_vi: restaurant.description_vi,
            opening_hours: restaurant.opening_hours,
            timezone: restaurant.timezone,
          },
        };
      },
      { ttlSeconds: CUSTOMER_RESTAURANT_META_TTL_SECONDS },
    );

    const response = NextResponse.json(payload);
    response.headers.set(
      "Cache-Control",
      `public, max-age=${CUSTOMER_RESTAURANT_META_TTL_SECONDS}, s-maxage=${CUSTOMER_RESTAURANT_META_TTL_SECONDS}, stale-while-revalidate=60`,
    );
    return response;
  } catch (error) {
    console.error("Unexpected error in customer restaurant API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to load restaurant data",
        details: message,
      },
      { status: 500 },
    );
  }
}
