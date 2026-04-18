import { NextRequest, NextResponse } from "next/server";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";

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

    const restaurant = restaurantContext.restaurant;

    // Return restaurant settings in customer-friendly format
    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        companyName: restaurant.companyName,
        logoUrl: restaurant.logoUrl,
        allowOrderNotes: restaurant.allowOrderNotes ?? true,
        subdomain: restaurant.subdomain,
        branchCode: restaurant.branchCode,
        companyPublicSubdomain: restaurant.companyPublicSubdomain,
        primaryColor: restaurant.primaryColor || "#3B82F6",
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
    });
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
