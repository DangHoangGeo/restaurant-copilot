import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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

// Update restaurant settings
export async function PATCH(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get restaurant_id from user metadata
    const restaurantId = session.session.user.user_metadata?.restaurant_id;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "No restaurant associated with user" },
        { status: 403 }
      );
    }

    const updates = await req.json();

    // Update restaurant settings
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        name: updates.name,
        logo_url: updates.logoUrl,
        brand_color: updates.primaryColor,
        default_language: updates.defaultLocale,
        contact_info: updates.contactInfo,
        description: updates.description,
        hours: updates.hours,
        phone: updates.phone,
      })
      .eq("id", restaurantId);

    if (updateError) {
      console.error("Error updating restaurant settings:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in update restaurant settings:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred", details: message },
      { status: 500 }
    );
  }
}