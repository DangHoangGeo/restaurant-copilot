import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubdomainFromHost } from "@/lib/utils";
import type {
  CustomerHomepageBranch,
  CustomerHomepageCompany,
  CustomerHomepageData,
  CustomerHomepageFeaturedItem,
  CustomerHomepageGalleryImage,
  CustomerHomepageOwner,
} from "@/shared/types";
import { listOrganizationSharedMenu } from "./organizations/shared-menu";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string | null;
  public_subdomain: string | null;
  logo_url: string | null;
  brand_color: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
}

interface BranchRow {
  id: string;
  name: string;
  subdomain: string;
  branch_code: string | null;
  logo_url: string | null;
  brand_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: unknown;
  currency: string | null;
  tagline_en: string | null;
  tagline_ja: string | null;
  tagline_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  google_rating: number | null;
  google_review_count: number | null;
}

interface BranchFeaturedRow {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ja: string | null;
  name_vi: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  price: number;
  image_url: string | null;
  restaurants: {
    id: string;
    name: string;
    subdomain: string;
    branch_code: string | null;
    currency: string | null;
  } | null;
  categories: {
    name_en: string | null;
    name_ja: string | null;
    name_vi: string | null;
  } | null;
}

function normalizeIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(normalized) ? normalized : null;
}

function mapCompany(
  organization: OrganizationRow | null,
  currentBranch: BranchRow,
): CustomerHomepageCompany {
  return {
    id: organization?.id ?? currentBranch.id,
    name: organization?.name ?? currentBranch.name,
    slug: organization?.slug ?? currentBranch.subdomain,
    publicSubdomain: organization?.public_subdomain ?? currentBranch.subdomain,
    logoUrl: organization?.logo_url ?? currentBranch.logo_url,
    brandColor: organization?.brand_color ?? currentBranch.brand_color,
    description_en:
      organization?.description_en ?? currentBranch.description_en,
    description_ja:
      organization?.description_ja ?? currentBranch.description_ja,
    description_vi:
      organization?.description_vi ?? currentBranch.description_vi,
    website: organization?.website ?? currentBranch.website,
    phone: organization?.phone ?? currentBranch.phone,
    email: organization?.email ?? currentBranch.email,
  };
}

function mapBranch(
  row: BranchRow,
  company: CustomerHomepageCompany,
  currentBranchId: string,
): CustomerHomepageBranch {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    branchCode: row.branch_code ?? row.subdomain,
    logoUrl: company.logoUrl ?? row.logo_url,
    brandColor: company.brandColor ?? row.brand_color,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    openingHours: row.opening_hours,
    currency: row.currency,
    tagline_en: row.tagline_en,
    tagline_ja: row.tagline_ja,
    tagline_vi: row.tagline_vi,
    description_en: row.description_en,
    description_ja: row.description_ja,
    description_vi: row.description_vi,
    googleRating: row.google_rating,
    googleReviewCount: row.google_review_count,
    isCurrent: row.id === currentBranchId,
  };
}

async function getOrganizationByIdentifier(
  identifier: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabaseAdmin
    .from("owner_organizations")
    .select(
      `
      id,
      name,
      slug,
      public_subdomain,
      logo_url,
      brand_color,
      description_en,
      description_ja,
      description_vi,
      website,
      phone,
      email
    `,
    )
    .or(`public_subdomain.eq.${identifier},slug.eq.${identifier}`)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrganizationRow;
}

async function getOrganizationForBranch(
  branchId: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabaseAdmin
    .from("organization_restaurants")
    .select(
      `
      owner_organizations(
        id,
        name,
        slug,
        public_subdomain,
        logo_url,
        brand_color,
        description_en,
        description_ja,
        description_vi,
        website,
        phone,
        email
      )
    `,
    )
    .eq("restaurant_id", branchId)
    .maybeSingle();

  if (error || !data?.owner_organizations) return null;

  const organization = Array.isArray(data.owner_organizations)
    ? data.owner_organizations[0]
    : data.owner_organizations;

  return (organization as OrganizationRow) ?? null;
}

async function getBranchBySubdomain(
  identifier: string,
): Promise<BranchRow | null> {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(
      `
      id,
      name,
      subdomain,
      branch_code,
      logo_url,
      brand_color,
      address,
      phone,
      email,
      website,
      opening_hours,
      currency,
      tagline_en,
      tagline_ja,
      tagline_vi,
      description_en,
      description_ja,
      description_vi,
      google_rating,
      google_review_count
    `,
    )
    .eq("subdomain", identifier)
    .maybeSingle();

  if (error || !data) return null;
  return data as BranchRow;
}

async function getBranchesForOrganization(
  organizationId: string,
): Promise<BranchRow[]> {
  const { data: links, error: linksError } = await supabaseAdmin
    .from("organization_restaurants")
    .select("restaurant_id")
    .eq("organization_id", organizationId)
    .order("added_at", { ascending: true });

  if (linksError || !links?.length) return [];

  const branchIds = links.map((row) => row.restaurant_id as string);
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(
      `
      id,
      name,
      subdomain,
      branch_code,
      logo_url,
      brand_color,
      address,
      phone,
      email,
      website,
      opening_hours,
      currency,
      tagline_en,
      tagline_ja,
      tagline_vi,
      description_en,
      description_ja,
      description_vi,
      google_rating,
      google_review_count
    `,
    )
    .in("id", branchIds);

  if (error || !data) return [];

  const branchMap = new Map((data as BranchRow[]).map((row) => [row.id, row]));
  return branchIds.flatMap((branchId) => {
    const branch = branchMap.get(branchId);
    return branch ? [branch] : [];
  });
}

async function getOwnersForBranch(
  branchId: string,
): Promise<CustomerHomepageOwner[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, photo_url")
    .eq("restaurant_id", branchId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(3);

  if (error || !data) return [];

  return data.map((owner) => ({
    id: owner.id,
    name: owner.name ?? null,
    email: owner.email ?? null,
    photoUrl: owner.photo_url ?? null,
  }));
}

async function getGalleryForBranch(
  branchId: string,
): Promise<CustomerHomepageGalleryImage[]> {
  const { data, error } = await supabaseAdmin
    .from("restaurant_gallery_images")
    .select("id, image_url, alt_text, caption, sort_order, is_hero")
    .eq("restaurant_id", branchId)
    .order("is_hero", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(6);

  if (error || !data) return [];

  return data.map((image) => ({
    id: image.id,
    imageUrl: image.image_url,
    altText: image.alt_text,
    caption: image.caption ?? null,
    sortOrder: image.sort_order,
    isHero: image.is_hero,
  }));
}

function mapBranchFeaturedItem(
  row: BranchFeaturedRow,
): CustomerHomepageFeaturedItem {
  return {
    id: row.id,
    name_en: row.name_en,
    name_ja: row.name_ja,
    name_vi: row.name_vi,
    description_en: row.description_en,
    description_ja: row.description_ja,
    description_vi: row.description_vi,
    price: Number(row.price ?? 0),
    currency: row.restaurants?.currency ?? null,
    imageUrl: row.image_url,
    categoryName_en: row.categories?.name_en ?? null,
    categoryName_ja: row.categories?.name_ja ?? null,
    categoryName_vi: row.categories?.name_vi ?? null,
    sourceType: "branch",
    branchId: row.restaurants?.id ?? row.restaurant_id,
    branchName: row.restaurants?.name ?? null,
    branchCode: row.restaurants?.branch_code ?? null,
    branchSubdomain: row.restaurants?.subdomain ?? null,
  };
}

async function getBranchFeaturedItems(
  branchIds: string[],
): Promise<CustomerHomepageFeaturedItem[]> {
  if (branchIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select(
      `
      id,
      restaurant_id,
      name_en,
      name_ja,
      name_vi,
      description_en,
      description_ja,
      description_vi,
      price,
      image_url,
      restaurants(id, name, subdomain, branch_code, currency),
      categories(name_en, name_ja, name_vi)
    `,
    )
    .in("restaurant_id", branchIds)
    .eq("available", true)
    .eq("is_signature", true)
    .order("position", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  const itemsByBranch = new Map<string, CustomerHomepageFeaturedItem[]>();

  for (const row of data as unknown as BranchFeaturedRow[]) {
    const item = mapBranchFeaturedItem(row);
    const branchId = item.branchId;
    if (!branchId) continue;
    const existing = itemsByBranch.get(branchId) ?? [];
    if (existing.length < 2) {
      existing.push(item);
      itemsByBranch.set(branchId, existing);
    }
  }

  const mixedItems: CustomerHomepageFeaturedItem[] = [];
  for (const branchId of branchIds) {
    const branchItems = itemsByBranch.get(branchId) ?? [];
    mixedItems.push(...branchItems);
    if (mixedItems.length >= 6) break;
  }

  return mixedItems.slice(0, 6);
}

async function getSharedFeaturedItems(
  organizationId: string,
  defaultBranch: BranchRow,
): Promise<CustomerHomepageFeaturedItem[]> {
  const categories = await listOrganizationSharedMenu(organizationId);
  const items = categories
    .flatMap((category) =>
      category.items
        .filter((item) => item.available)
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi,
          description_en: item.description_en,
          description_ja: item.description_ja,
          description_vi: item.description_vi,
          price: Number(item.price ?? 0),
          currency: defaultBranch.currency,
          imageUrl: item.image_url,
          categoryName_en: category.name_en,
          categoryName_ja: category.name_ja,
          categoryName_vi: category.name_vi,
          sourceType: "shared" as const,
          branchId: defaultBranch.id,
          branchName: null,
          branchCode: defaultBranch.branch_code,
          branchSubdomain: defaultBranch.subdomain,
        })),
    )
    .slice(0, 3);

  return items;
}

export async function getPublicHomepageData(params: {
  host?: string | null;
  subdomain?: string | null;
}): Promise<CustomerHomepageData | null> {
  const identifier = normalizeIdentifier(
    params.subdomain ??
      (params.host ? getSubdomainFromHost(params.host) : null),
  );

  if (!identifier) {
    return null;
  }

  const organization = await getOrganizationByIdentifier(identifier);

  if (organization) {
    const branches = await getBranchesForOrganization(organization.id);
    const currentBranch = branches[0];

    if (!currentBranch) return null;

    const company = mapCompany(organization, currentBranch);

    const [owners, gallery, sharedItems, branchItems] = await Promise.all([
      getOwnersForBranch(currentBranch.id),
      getGalleryForBranch(currentBranch.id),
      getSharedFeaturedItems(organization.id, currentBranch),
      getBranchFeaturedItems(branches.map((branch) => branch.id)),
    ]);

    return {
      source: "organization",
      company,
      currentBranch: mapBranch(currentBranch, company, currentBranch.id),
      branches: branches.map((branch) =>
        mapBranch(branch, company, currentBranch.id),
      ),
      owners,
      gallery,
      featuredItems: [...sharedItems, ...branchItems].slice(0, 6),
    };
  }

  const currentBranch = await getBranchBySubdomain(identifier);
  if (!currentBranch) return null;

  const branchOrganization = await getOrganizationForBranch(currentBranch.id);
  const branches = branchOrganization
    ? await getBranchesForOrganization(branchOrganization.id)
    : [currentBranch];

  const [owners, gallery, sharedItems, branchItems] = await Promise.all([
    getOwnersForBranch(currentBranch.id),
    getGalleryForBranch(currentBranch.id),
    branchOrganization
      ? getSharedFeaturedItems(branchOrganization.id, currentBranch)
      : Promise.resolve([]),
    getBranchFeaturedItems(branches.map((branch) => branch.id)),
  ]);

  const company = mapCompany(branchOrganization, currentBranch);

  return {
    source: branchOrganization ? "organization" : "branch",
    company,
    currentBranch: mapBranch(currentBranch, company, currentBranch.id),
    branches: branches.map((branch) =>
      mapBranch(branch, company, currentBranch.id),
    ),
    owners,
    gallery,
    featuredItems: [...sharedItems, ...branchItems].slice(0, 6),
  };
}
