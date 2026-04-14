import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubdomainFromHost } from "@/lib/utils";

/**
 * Customer API: Get restaurant data by subdomain
 * Used by customer-facing pages for progressive loading
 */
export async function GET(req: NextRequest) {
  try {
    // Get subdomain from host header or query param
    const hostHeader = req.headers.get('host') || '';
    const subdomainFromHost = getSubdomainFromHost(hostHeader);
    const subdomainFromQuery = req.nextUrl.searchParams.get("subdomain");
    
    const subdomain = subdomainFromQuery || subdomainFromHost;

    if (!subdomain) {
      return NextResponse.json({ 
        error: "No subdomain provided. Please access via restaurant subdomain." 
      }, { status: 400 });
    }

    // Basic validation for subdomain format
    if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      return NextResponse.json({ 
        error: "Invalid subdomain format" 
      }, { status: 400 });
    }

    // Fetch restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select(`
        id,
        name,
        logo_url,
        subdomain,
        brand_color,
        default_language,
        address,
        phone,
        email,
        website,
        description_en,
        description_ja,
        description_vi,
        opening_hours,
        timezone,
        allow_order_notes
      `)
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({
        error: "Restaurant not found",
        details: restaurantError?.message
      }, { status: 404 });
    }

    // Parse opening hours if it's a JSON string
    let parsedOpeningHours = null;
    try {
      if (restaurant.opening_hours && typeof restaurant.opening_hours === 'string') {
        parsedOpeningHours = JSON.parse(restaurant.opening_hours);
      } else {
        parsedOpeningHours = restaurant.opening_hours;
      }
    } catch (error) {
      console.warn('Failed to parse opening_hours JSON:', error);
      parsedOpeningHours = restaurant.opening_hours;
    }

    // Return restaurant settings in customer-friendly format
    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        logoUrl: restaurant.logo_url,
        subdomain: restaurant.subdomain,
        primaryColor: restaurant.brand_color || '#3B82F6',
        defaultLocale: restaurant.default_language || 'en',
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,
        description_en: restaurant.description_en,
        description_ja: restaurant.description_ja,
        description_vi: restaurant.description_vi,
        opening_hours: parsedOpeningHours,
        timezone: restaurant.timezone,
        allow_order_notes: restaurant.allow_order_notes ?? true
      }
    });

  } catch (error) {
    console.error("Unexpected error in customer restaurant API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Failed to load restaurant data",
      details: message
    }, { status: 500 });
  }
}
