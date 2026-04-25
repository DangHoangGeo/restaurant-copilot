import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Cache for 60 seconds on the CDN — public, no auth required.
export const revalidate = 60;

interface BranchRow {
  id: string;
  name: string;
  subdomain: string;
  branch_code: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tagline_en: string | null;
  tagline_ja: string | null;
  tagline_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  currency: string | null;
  logo_url: string | null;
  brand_color: string | null;
}

interface OrgRow {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  public_subdomain: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
}

interface FeaturedDishRow {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  image_url: string | null;
  price: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const province = searchParams.get("province")?.trim() || null;
  const district = searchParams.get("district")?.trim() || null;
  const search = searchParams.get("search")?.trim() || null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "60", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  // Fetch active, verified branches joined to their organization links.
  let branchQuery = supabaseAdmin
    .from("restaurants")
    .select(
      `
      id,
      name,
      subdomain,
      branch_code,
      address,
      province,
      district,
      city,
      latitude,
      longitude,
      google_rating,
      google_review_count,
      tagline_en,
      tagline_ja,
      tagline_vi,
      description_en,
      description_ja,
      description_vi,
      currency,
      logo_url,
      brand_color
    `,
    )
    .eq("is_active", true)
    .eq("is_verified", true)
    .is("suspended_at", null);

  if (province) {
    branchQuery = branchQuery.ilike("province", province);
  }
  if (district) {
    branchQuery = branchQuery.ilike("district", district);
  }
  if (search) {
    branchQuery = branchQuery.or(
      `name.ilike.%${search}%,address.ilike.%${search}%,tagline_en.ilike.%${search}%,city.ilike.%${search}%`,
    );
  }

  branchQuery = branchQuery
    .order("google_rating", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data: branches, error: branchError } = await branchQuery;

  if (branchError) {
    return NextResponse.json({ error: "Failed to load restaurants" }, { status: 500 });
  }

  if (!branches?.length) {
    return NextResponse.json({ branches: [], provinces: [], districts: [] });
  }

  const branchIds = (branches as BranchRow[]).map((b) => b.id);

  const { data: featuredDishes } = await supabaseAdmin
    .from("menu_items")
    .select("id, restaurant_id, name_en, name_ja, name_vi, image_url, price")
    .in("restaurant_id", branchIds)
    .eq("available", true)
    .eq("is_signature", true)
    .not("image_url", "is", null)
    .order("position", { ascending: true });

  const branchToFeaturedDish = new Map<string, FeaturedDishRow>();
  for (const dish of (featuredDishes ?? []) as FeaturedDishRow[]) {
    if (!branchToFeaturedDish.has(dish.restaurant_id)) {
      branchToFeaturedDish.set(dish.restaurant_id, dish);
    }
  }

  // Fetch org links for all returned branches in one query.
  const { data: orgLinks } = await supabaseAdmin
    .from("organization_restaurants")
    .select(
      `
      restaurant_id,
      owner_organizations(
        id,
        name,
        logo_url,
        brand_color,
        public_subdomain,
        description_en,
        description_ja,
        description_vi,
        approval_status,
        is_active
      )
    `,
    )
    .in("restaurant_id", branchIds);

  // Build a map: branchId → org (only approved + active orgs).
  const branchToOrg = new Map<string, OrgRow>();
  for (const link of orgLinks ?? []) {
    const org = Array.isArray(link.owner_organizations)
      ? link.owner_organizations[0]
      : link.owner_organizations;
    if (
      org &&
      (org as OrgRow & { approval_status: string; is_active: boolean })
        .approval_status === "approved" &&
      (org as OrgRow & { is_active: boolean }).is_active
    ) {
      branchToOrg.set(link.restaurant_id as string, org as OrgRow);
    }
  }

  // Fetch distinct province/district values for the filter UI (unfiltered).
  const { data: provinceRows } = await supabaseAdmin
    .from("restaurants")
    .select("province")
    .eq("is_active", true)
    .eq("is_verified", true)
    .is("suspended_at", null)
    .not("province", "is", null)
    .order("province");

  const provinces: string[] = [
    ...new Set(
      (provinceRows ?? [])
        .map((r: { province: string | null }) => r.province)
        .filter(Boolean) as string[],
    ),
  ];

  // If a province is selected, also return districts within it.
  let districts: string[] = [];
  if (province) {
    const { data: districtRows } = await supabaseAdmin
      .from("restaurants")
      .select("district")
      .eq("is_active", true)
      .eq("is_verified", true)
      .is("suspended_at", null)
      .ilike("province", province)
      .not("district", "is", null)
      .order("district");

    districts = [
      ...new Set(
        (districtRows ?? [])
          .map((r: { district: string | null }) => r.district)
          .filter(Boolean) as string[],
      ),
    ];
  }

  const result = (branches as BranchRow[]).map((branch) => {
    const org = branchToOrg.get(branch.id) ?? null;
    const featuredDish = branchToFeaturedDish.get(branch.id) ?? null;
    return {
      id: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
      branchCode: branch.branch_code,
      address: branch.address,
      province: branch.province,
      district: branch.district,
      city: branch.city,
      latitude: branch.latitude,
      longitude: branch.longitude,
      googleRating: branch.google_rating,
      googleReviewCount: branch.google_review_count,
      tagline_en: branch.tagline_en,
      tagline_ja: branch.tagline_ja,
      tagline_vi: branch.tagline_vi,
      description_en: branch.description_en,
      description_ja: branch.description_ja,
      description_vi: branch.description_vi,
      currency: branch.currency,
      logoUrl: org?.logo_url ?? branch.logo_url,
      brandColor: org?.brand_color ?? branch.brand_color,
      featuredDish: featuredDish
        ? {
            id: featuredDish.id,
            name_en: featuredDish.name_en,
            name_ja: featuredDish.name_ja,
            name_vi: featuredDish.name_vi,
            imageUrl: featuredDish.image_url,
            price: Number(featuredDish.price ?? 0),
            currency: branch.currency,
          }
        : null,
      org: org
        ? {
            id: org.id,
            name: org.name,
            logoUrl: org.logo_url,
            brandColor: org.brand_color,
            publicSubdomain: org.public_subdomain,
          }
        : null,
    };
  });

  return NextResponse.json(
    { branches: result, provinces, districts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
