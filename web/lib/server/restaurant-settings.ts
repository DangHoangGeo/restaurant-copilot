import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { createCustomerBrandTheme } from "@/lib/utils/colors";
import type { RestaurantSettings } from "@/shared/types/customer";

async function getOrganizationBrandingForRestaurant(
  restaurantId: string,
): Promise<{
  name: string | null;
  publicSubdomain: string | null;
  logoUrl: string | null;
  brandColor: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("organization_restaurants")
    .select(
      "owner_organizations(name, public_subdomain, logo_url, brand_color)",
    )
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error || !data?.owner_organizations) {
    return null;
  }

  const organization = Array.isArray(data.owner_organizations)
    ? data.owner_organizations[0]
    : data.owner_organizations;

  if (!organization) return null;

  return {
    name: organization.name ?? null,
    publicSubdomain: organization.public_subdomain ?? null,
    logoUrl: organization.logo_url ?? null,
    brandColor: organization.brand_color ?? null,
  };
}

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;

  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, logo_url, subdomain, branch_code, brand_color, default_language, onboarded, owner_photo_url, owner_story_en, owner_story_ja, owner_story_vi",
      )
      .eq("subdomain", subdomain)
      .single();

    if (error) {
      await logger.error(
        "getRestaurantSettingsFromSubdomain",
        "Error fetching restaurant by subdomain",
        {
          subdomain,
          error: error.message,
        },
      );
      return null;
    }
    if (!restaurant) {
      return null;
    }

    const organizationBranding = await getOrganizationBrandingForRestaurant(
      restaurant.id,
    );
    const theme = createCustomerBrandTheme(
      restaurant.brand_color ?? organizationBranding?.brandColor,
    );

    return {
      id: restaurant.id,
      name: restaurant.name,
      companyName: organizationBranding?.name ?? restaurant.name,
      logoUrl: organizationBranding?.logoUrl ?? restaurant.logo_url,
      subdomain: restaurant.subdomain,
      branchCode: restaurant.branch_code ?? restaurant.subdomain,
      companyPublicSubdomain: organizationBranding?.publicSubdomain ?? null,
      primaryColor: theme.primary,
      defaultLocale: restaurant.default_language || "en",
      onboarded: restaurant.onboarded || false,
      owner_photo_url: restaurant.owner_photo_url || null,
      owner_story_en: restaurant.owner_story_en || "",
      owner_story_ja: restaurant.owner_story_ja || "",
      owner_story_vi: restaurant.owner_story_vi || "",
    };
  } catch (e) {
    await logger.error(
      "getRestaurantSettingsFromSubdomain",
      "Exception fetching restaurant by subdomain",
      {
        subdomain,
        error: e instanceof Error ? e.message : "Unknown error",
      },
    );
    return null;
  }
}

/**
 * Fetches the full set of customer-facing restaurant settings for a given subdomain.
 * Used by the customer layout server component to pre-populate CustomerDataContext,
 * eliminating the client-side fetch that previously caused a skeleton flash on every page.
 */
export async function getCustomerRestaurantFromSubdomain(
  subdomain: string,
): Promise<RestaurantSettings | null> {
  if (!subdomain) return null;

  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, logo_url, subdomain, branch_code, brand_color, default_language, address, phone, email, website, description_en, description_ja, description_vi, opening_hours, timezone, allow_order_notes",
      )
      .eq("subdomain", subdomain)
      .single();

    if (error || !restaurant) {
      await logger.error(
        "getCustomerRestaurantFromSubdomain",
        "Error fetching customer restaurant",
        {
          subdomain,
          error: error?.message,
        },
      );
      return null;
    }

    let parsedOpeningHours: Record<string, string> | undefined = undefined;
    try {
      if (
        restaurant.opening_hours &&
        typeof restaurant.opening_hours === "string"
      ) {
        parsedOpeningHours = JSON.parse(restaurant.opening_hours);
      } else if (restaurant.opening_hours) {
        parsedOpeningHours = restaurant.opening_hours as Record<string, string>;
      }
    } catch {
      parsedOpeningHours = undefined;
    }

    const organizationBranding = await getOrganizationBrandingForRestaurant(
      restaurant.id,
    );

    const theme = createCustomerBrandTheme(
      restaurant.brand_color ?? organizationBranding?.brandColor,
    );

    return {
      id: restaurant.id,
      name: restaurant.name,
      companyName: organizationBranding?.name ?? restaurant.name,
      subdomain: restaurant.subdomain,
      branchCode: restaurant.branch_code ?? restaurant.subdomain,
      companyPublicSubdomain: organizationBranding?.publicSubdomain ?? null,
      logoUrl: organizationBranding?.logoUrl ?? restaurant.logo_url,
      allowOrderNotes: restaurant.allow_order_notes ?? true,
      primaryColor: theme.primary,
      defaultLocale: restaurant.default_language || "en",
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      description_en: restaurant.description_en,
      description_ja: restaurant.description_ja,
      description_vi: restaurant.description_vi,
      opening_hours: parsedOpeningHours,
      timezone: restaurant.timezone,
    };
  } catch (e) {
    await logger.error(
      "getCustomerRestaurantFromSubdomain",
      "Exception fetching customer restaurant",
      {
        subdomain,
        error: e instanceof Error ? e.message : "Unknown error",
      },
    );
    return null;
  }
}

export async function getRestaurantIdFromSubdomain(
  subdomain: string,
): Promise<string | null> {
  if (!subdomain) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (error) {
      await logger.error(
        "getRestaurantIdFromSubdomain",
        "Error fetching restaurant ID for subdomain",
        {
          subdomain,
          error: error.message,
        },
      );
      return null;
    }
    return data?.id || null;
  } catch (e) {
    await logger.error(
      "getRestaurantIdFromSubdomain",
      "Exception fetching restaurant ID for subdomain",
      {
        subdomain,
        error: e instanceof Error ? e.message : "Unknown error",
      },
    );
    return null;
  }
}
