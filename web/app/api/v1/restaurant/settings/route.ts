import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(1).max(100),
  default_language: z.enum(["ja", "en", "vi"]),
  brand_color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).nullable().optional(),
  contact_info: z.string().max(500).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(100).nullable().optional(),
  website: z.string().url().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  opening_hours: z.string().max(500).nullable().optional(),
  social_links: z.string().max(1000).nullable().optional(),
  timezone: z.string().max(100).nullable().default('Asia/Tokyo'),
  currency: z.string().max(10).nullable().default('JPY'),
  payment_methods: z.array(z.string()).nullable().optional(),
  delivery_options: z.array(z.string()).nullable().optional(),
  logo_url: z.string().url().nullable().nullable().optional(),
});

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

export async function PATCH(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");

  if (!subdomain) {
    return NextResponse.json({ error: "Subdomain is required" }, { status: 400 });
  }

  try {
    // First, verify the restaurant exists and get its ID
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError || !restaurant) {
      console.error("Error finding restaurant:", restaurantError);
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update(validation.data)
      .eq("id", restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating restaurant:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    console.error("Unexpected error in restaurant settings update:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected error occurred", details: message },
      { status: 500 }
    );
  }
}
