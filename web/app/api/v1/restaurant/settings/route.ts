import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { z } from "zod";
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Ensure this path is correct

const settingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  default_language: z.enum(["ja", "en", "vi"]).optional(),
  brand_color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(100).nullable().optional()
    .refine((val) => !val || val === "" || z.string().email().safeParse(val).success, "Invalid email format"),
  website: z.string().max(200).nullable().optional()
    .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Invalid website URL"),
  tax: z.number().min(0).max(1).optional(), // Tax rate as decimal (0.10 = 10%)
  description_en: z.string().max(1000).nullable().optional(),
  description_ja: z.string().max(1000).nullable().optional(),
  description_vi: z.string().max(1000).nullable().optional(),
  // Owner story fields
  owner_story_en: z.string().max(1000).nullable().optional(),
  owner_story_ja: z.string().max(1000).nullable().optional(),
  owner_story_vi: z.string().max(1000).nullable().optional(),
  owner_photo_url: z.string().url().nullable().optional(),
  opening_hours: z.record(z.string(), z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
    isClosed: z.boolean().optional()
  })).optional(),
  social_links: z.object({
    facebook: z.string().nullable().optional()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Invalid Facebook URL"),
    instagram: z.string().nullable().optional()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Invalid Instagram URL"),
    twitter: z.string().nullable().optional()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Invalid Twitter URL"),
    website: z.string().nullable().optional()
      .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Invalid website URL"),
  }).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  currency: z.enum(["JPY", "USD", "VND"]).nullable().optional(),
  payment_methods: z.array(z.enum(["cash", "credit_card", "mobile_payment", "paypay"])).nullable().optional(),
  delivery_options: z.array(z.enum(["pickup", "delivery", "dine_in"])).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  // WiFi settings for table QR codes
  wifi_ssid: z.string().max(100).nullable().optional(),
  wifi_password: z.string().max(100).nullable().optional(),
  allow_order_notes: z.boolean().optional(),
});

export async function GET() {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized: Missing user or restaurant ID" }, { status: 401 });
  }

  // Optional: Cross-check subdomain if still passed, but primary identifier should be user.restaurantId
  // const requestSubdomain = req.nextUrl.searchParams.get("subdomain");
  // if (requestSubdomain && requestSubdomain !== user.subdomain) {
  //   return NextResponse.json({ error: "Forbidden: Subdomain mismatch" }, { status: 403 });
  // }

  try {
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select(`
        id,
        name,
        subdomain,
        logo_url,
        brand_color,
        default_language,
        address,
        phone,
        email,
        website,
        tax,
        description_en,
        description_ja,
        description_vi,
        opening_hours,
        social_links,
        timezone,
        currency,
        payment_methods,
        delivery_options,
        onboarded,
        hero_title_en,
        hero_title_ja,
        hero_title_vi,
        hero_subtitle_en,
        hero_subtitle_ja,
        hero_subtitle_vi,
        owner_story_en,
        owner_story_ja,
        owner_story_vi,
        owner_photo_url,
        wifi_ssid,
        wifi_password,
        allow_order_notes
      `)
      .eq("id", user.restaurantId) // Use authenticated user's restaurant ID
      .single();

    if (restaurantError) {
      console.error("Error fetching restaurant settings:", restaurantError);
      return NextResponse.json(
        { error: restaurantError.message },
        { status: restaurantError.code === "PGRST116" ? 404 : 500 } // PGRST116: row not found
      );
    }
    if (!restaurant) { // Should be caught by PGRST116, but as a safeguard
        return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Parse JSON strings back to objects for consistent API response
    let parsedOpeningHours = null;
    let parsedSocialLinks = null;

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

    try {
      if (restaurant.social_links && typeof restaurant.social_links === 'string') {
        parsedSocialLinks = JSON.parse(restaurant.social_links);
      } else {
        parsedSocialLinks = restaurant.social_links;
      }
    } catch (error) {
      console.warn('Failed to parse social_links JSON:', error);
      parsedSocialLinks = restaurant.social_links;
    }
    console.log("Restaurant settings fetched successfully - onboarded status:", restaurant.onboarded, "type:", typeof restaurant.onboarded);
    const responseData = {
      id: restaurant.id,
      name: restaurant.name,
      subdomain: restaurant.subdomain,
      logo_url: restaurant.logo_url,
      brand_color: restaurant.brand_color || "#3B82F6",
      default_language: restaurant.default_language || "en",
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      tax: restaurant.tax || 0.10,
      description_en: restaurant.description_en,
      description_ja: restaurant.description_ja,
      description_vi: restaurant.description_vi,
      opening_hours: parsedOpeningHours,
      social_links: parsedSocialLinks,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
      payment_methods: restaurant.payment_methods,
      delivery_options: restaurant.delivery_options,
      // Add the missing onboarding-related fields
      onboarded: restaurant.onboarded,
      hero_title_en: restaurant.hero_title_en,
      hero_title_ja: restaurant.hero_title_ja,
      hero_title_vi: restaurant.hero_title_vi,
      hero_subtitle_en: restaurant.hero_subtitle_en,
      hero_subtitle_ja: restaurant.hero_subtitle_ja,
      hero_subtitle_vi: restaurant.hero_subtitle_vi,
      owner_story_en: restaurant.owner_story_en,
      owner_story_ja: restaurant.owner_story_ja,
      owner_story_vi: restaurant.owner_story_vi,
      owner_photo_url: restaurant.owner_photo_url,
      // WiFi settings
      wifi_ssid: restaurant.wifi_ssid,
      wifi_password: restaurant.wifi_password,
      // Ordering options
      allow_order_notes: restaurant.allow_order_notes ?? true,
    };

    console.log('Restaurant settings response - onboarded:', restaurant.onboarded, 'type:', typeof restaurant.onboarded);

    return NextResponse.json(responseData);
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
  const user: AuthUser | null = await getUserFromRequest();
  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized: Missing user or restaurant ID" }, { status: 401 });
  }

  // TODO: Add role-based authorization check here (e.g., user must be 'owner' or 'manager')
  // const { data: userRoleData, error: roleError } = await supabase
  //   .from('employees') // or your user roles table
  //   .select('role')
  //   .eq('user_id', user.userId)
  //   .eq('restaurant_id', user.restaurantId)
  //   .single();
  // if (roleError || !userRoleData || !['owner', 'manager'].includes(userRoleData.role)) {
  //   return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  // }

  // The subdomain from query param is no longer used to identify the restaurant for update.
  // We rely solely on user.restaurantId from the authenticated session.

  try {
    const body = await req.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    if (Object.keys(validation.data).length === 0) {
        return NextResponse.json({ error: "No settings provided to update" }, { status: 400 });
    }

    // Transform data for database storage (convert objects to JSON strings where needed)
    const dataForDB: Record<string, unknown> = { ...validation.data };
    
    // Convert opening_hours object to JSON string for database storage
    if (validation.data.opening_hours) {
      dataForDB.opening_hours = JSON.stringify(validation.data.opening_hours);
    }
    
    // Convert social_links object to JSON string for database storage  
    if (validation.data.social_links) {
      dataForDB.social_links = JSON.stringify(validation.data.social_links);
    }

    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update(dataForDB)
      .eq("id", user.restaurantId) // CRITICAL: Update based on authenticated user's restaurant ID
      .select()
      .single();

    if (updateError) {
      console.error("Error updating restaurant:", updateError);
      // Handle specific errors like PGRST116 if the restaurant somehow doesn't exist for this ID
      if (updateError.code === "PGRST116") {
        return NextResponse.json({ error: "Restaurant not found or no changes made." }, { status: 404 });
      }
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
