import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from "zod";
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Ensure this path is correct

const settingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  default_language: z.enum(["ja", "en", "vi"]).optional(),
  brand_color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).nullable().optional(),
  contact_info: z.string().max(500).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(100).nullable().optional(),
  website: z.string().url().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  opening_hours: z.string().max(500).nullable().optional(), // Consider a more structured type
  social_links: z.string().max(1000).nullable().optional(), // Consider JSON or structured type
  timezone: z.string().max(100).nullable().optional(), // Default removed here, handle in logic or DB
  currency: z.string().max(10).nullable().optional(), // Default removed here
  payment_methods: z.array(z.string()).nullable().optional(),
  delivery_options: z.array(z.string()).nullable().optional(),
  logo_url: z.string().url().nullable().optional(), // Removed double nullable()
});

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
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
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select(`
        name,
        logo_url,
        subdomain,
        brand_color,
        default_language,
        contact_info,
        description,
        opening_hours,
        phone
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

    return NextResponse.json({
      name: restaurant.name,
      logoUrl: restaurant.logo_url,
      subdomain: restaurant.subdomain,
      primaryColor: restaurant.brand_color || "#3B82F6",
      defaultLocale: restaurant.default_language || "en",
      contactInfo: restaurant.contact_info,
      description: restaurant.description,
      opening_hours: restaurant.opening_hours, // Ensure this matches the selected column name
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
  const supabase = createRouteHandlerClient({ cookies });
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

    const { data: updatedRestaurant, error: updateError } = await supabase
      .from("restaurants")
      .update(validation.data)
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
