import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DiscoverPageClient } from "@/components/features/discover/DiscoverPageClient";
import type { DiscoverBranch, DiscoverApiResponse } from "@/shared/types/discover";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "discover" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

async function getInitialDiscoverData(): Promise<DiscoverApiResponse> {
  const { data: branches, error } = await supabaseAdmin
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
    .is("suspended_at", null)
    .order("google_rating", { ascending: false, nullsFirst: false })
    .limit(60);

  if (error || !branches?.length) {
    return { branches: [], provinces: [], districts: [] };
  }

  const branchIds = branches.map((b) => b.id);

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
        approval_status,
        is_active
      )
    `,
    )
    .in("restaurant_id", branchIds);

  const branchToOrg = new Map<string, {
    id: string;
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    publicSubdomain: string | null;
  }>();

  for (const link of orgLinks ?? []) {
    const org = Array.isArray(link.owner_organizations)
      ? link.owner_organizations[0]
      : link.owner_organizations;
    if (
      org &&
      (org as { approval_status: string; is_active: boolean })
        .approval_status === "approved" &&
      (org as { is_active: boolean }).is_active
    ) {
      branchToOrg.set(link.restaurant_id as string, {
        id: (org as { id: string }).id,
        name: (org as { name: string }).name,
        logoUrl: (org as { logo_url: string | null }).logo_url,
        brandColor: (org as { brand_color: string | null }).brand_color,
        publicSubdomain: (org as { public_subdomain: string | null })
          .public_subdomain,
      });
    }
  }

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

  const result: DiscoverBranch[] = branches.map((branch) => {
    const org = branchToOrg.get(branch.id) ?? null;
    return {
      id: branch.id,
      name: branch.name,
      subdomain: branch.subdomain,
      branchCode: branch.branch_code,
      address: branch.address,
      province: branch.province ?? null,
      district: branch.district ?? null,
      city: branch.city ?? null,
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
      googleRating: branch.google_rating ?? null,
      googleReviewCount: branch.google_review_count ?? null,
      tagline_en: branch.tagline_en ?? null,
      tagline_ja: branch.tagline_ja ?? null,
      tagline_vi: branch.tagline_vi ?? null,
      description_en: branch.description_en ?? null,
      description_ja: branch.description_ja ?? null,
      description_vi: branch.description_vi ?? null,
      currency: branch.currency ?? null,
      logoUrl: org?.logoUrl ?? branch.logo_url ?? null,
      brandColor: org?.brandColor ?? branch.brand_color ?? null,
      org,
    };
  });

  return { branches: result, provinces, districts: [] };
}

export default async function DiscoverPage({ params }: Props) {
  const { locale } = await params;
  const initialData = await getInitialDiscoverData();

  return <DiscoverPageClient initialData={initialData} locale={locale} />;
}
