import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");

  if (!subdomain) {
    return NextResponse.json({ error: "Subdomain is required" }, { status: 400 });
  }

  try {
    // Fetch restaurant settings based on subdomain
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select(`
        name,
        logo_url,
        subdomain,
        brand_color,
        default_language,
        contact_info,
        description,
        hours,
        phone
      `)
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError) {
      console.error("Error fetching restaurant settings:", restaurantError);
      return NextResponse.json(
        { error: restaurantError.message },
        { status: restaurantError.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      name: restaurant.name,
      logoUrl: restaurant.logo_url,
      subdomain: restaurant.subdomain,
      primaryColor: restaurant.brand_color || "#3B82F6", // Default to Tailwind blue
      defaultLocale: restaurant.default_language || "en",
      contactInfo: restaurant.contact_info,
      description: restaurant.description,
      hours: restaurant.hours,
      phone: restaurant.phone,
    });
  } catch (error) {
    console.error("Unexpected error in restaurant settings API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred", details: message },
      { status: 500 }
    );
  }
}
