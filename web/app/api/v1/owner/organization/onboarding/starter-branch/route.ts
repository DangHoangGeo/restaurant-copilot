import { NextResponse } from "next/server";
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from "@/lib/server/authorization/service";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden("Requires organization_settings permission");
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from("organization_restaurants")
    .select("restaurant_id")
    .eq("organization_id", ctx!.organization.id)
    .order("added_at", { ascending: true });

  if (linksError) {
    console.error(
      "Failed to load onboarding starter branch links:",
      linksError,
    );
    return NextResponse.json(
      { error: "Failed to load starter branch" },
      { status: 500 },
    );
  }

  const accessibleIds = new Set(ctx!.accessibleRestaurantIds);
  const starterBranchId = (links ?? []).find((link) =>
    accessibleIds.has(link.restaurant_id),
  )?.restaurant_id;

  if (!starterBranchId) {
    return NextResponse.json(
      { error: "No accessible starter branch was found for this organization" },
      { status: 404 },
    );
  }

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from("restaurants")
    .select(
      `
      id,
      name,
      subdomain,
      branch_code,
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
      owner_photo_url
    `,
    )
    .eq("id", starterBranchId)
    .single();

  if (restaurantError || !restaurant) {
    console.error("Failed to load onboarding starter branch:", restaurantError);
    return NextResponse.json(
      { error: "Failed to load starter branch" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    restaurant: {
      ...restaurant,
      company_public_subdomain: ctx!.organization.public_subdomain ?? null,
    },
  });
}
