import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSubdomainFromHost } from '@/lib/utils';
import type { RestaurantSettings } from '@/shared/types/customer';

interface OrganizationPublicRow {
  id: string;
  name: string;
  slug: string;
  public_subdomain: string;
}

interface RestaurantPublicRow {
  id: string;
  name: string;
  subdomain: string;
  branch_code: string | null;
  logo_url: string | null;
  brand_color: string | null;
  default_language: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  opening_hours: unknown;
  timezone: string | null;
}

export interface CompanyContext {
  id: string;
  name: string;
  slug: string;
  publicSubdomain: string;
}

export interface CompanyRestaurantContext {
  company: CompanyContext;
  restaurant: RestaurantSettings;
}

export interface CustomerEntryContext extends CompanyRestaurantContext {
  tableId: string;
  activeSessionId: string | null;
  requirePasscode: boolean;
}

function normalizePublicCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(normalized) ? normalized : null;
}

function parseOpeningHours(value: unknown): Record<string, string> | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch {
      return undefined;
    }
  }
  return value as Record<string, string>;
}

function mapRestaurantSettings(
  restaurant: RestaurantPublicRow,
  company: CompanyContext
): RestaurantSettings {
  return {
    id: restaurant.id,
    name: restaurant.name,
    subdomain: restaurant.subdomain,
    branchCode: restaurant.branch_code ?? restaurant.subdomain,
    companyPublicSubdomain: company.publicSubdomain,
    logoUrl: restaurant.logo_url,
    primaryColor: restaurant.brand_color || '#3B82F6',
    defaultLocale: restaurant.default_language || 'en',
    address: restaurant.address,
    phone: restaurant.phone,
    email: restaurant.email,
    website: restaurant.website,
    description_en: restaurant.description_en,
    description_ja: restaurant.description_ja,
    description_vi: restaurant.description_vi,
    opening_hours: parseOpeningHours(restaurant.opening_hours),
    timezone: restaurant.timezone ?? undefined,
  };
}

async function getOrganizationByIdentifier(
  identifier: string
): Promise<OrganizationPublicRow | null> {
  const normalized = normalizePublicCode(identifier);
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from('owner_organizations')
    .select('id, name, slug, public_subdomain')
    .or(`public_subdomain.eq.${normalized},slug.eq.${normalized}`)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrganizationPublicRow;
}

async function getCompanyForRestaurant(
  restaurantId: string
): Promise<CompanyContext | null> {
  const { data, error } = await supabaseAdmin
    .from('organization_restaurants')
    .select('owner_organizations(id, name, slug, public_subdomain)')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error || !data?.owner_organizations) return null;

  const org = Array.isArray(data.owner_organizations)
    ? data.owner_organizations[0]
    : data.owner_organizations;

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    publicSubdomain: org.public_subdomain,
  };
}

async function getRestaurantById(
  restaurantId: string
): Promise<CompanyRestaurantContext | null> {
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select(`
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
      description_en,
      description_ja,
      description_vi,
      opening_hours,
      timezone
    `)
    .eq('id', restaurantId)
    .maybeSingle();

  if (error || !data) return null;

  const company = await getCompanyForRestaurant(restaurantId);
  if (!company) return null;

  return {
    company,
    restaurant: mapRestaurantSettings(data as RestaurantPublicRow, company),
  };
}

async function getRestaurantByLegacySubdomain(
  subdomain: string
): Promise<CompanyRestaurantContext | null> {
  const normalized = normalizePublicCode(subdomain);
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('subdomain', normalized)
    .maybeSingle();

  if (error || !data?.id) return null;
  return getRestaurantById(data.id as string);
}

async function getRestaurantByCompanyAndBranch(params: {
  organization: OrganizationPublicRow;
  branchCode: string;
}): Promise<CompanyRestaurantContext | null> {
  const normalizedBranchCode = normalizePublicCode(params.branchCode);
  if (!normalizedBranchCode) return null;

  const { data: links, error: linksError } = await supabaseAdmin
    .from('organization_restaurants')
    .select('restaurant_id')
    .eq('organization_id', params.organization.id);

  if (linksError || !links?.length) return null;

  const restaurantIds = links.map((row) => row.restaurant_id as string);
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .in('id', restaurantIds)
    .or(`branch_code.eq.${normalizedBranchCode},subdomain.eq.${normalizedBranchCode}`)
    .maybeSingle();

  if (error || !data?.id) return null;
  return getRestaurantById(data.id as string);
}

export async function resolvePublicRestaurantContext(params: {
  host?: string | null;
  orgIdentifier?: string | null;
  branchCode?: string | null;
  restaurantId?: string | null;
  subdomain?: string | null;
}): Promise<CompanyRestaurantContext | null> {
  if (params.restaurantId) {
    return getRestaurantById(params.restaurantId);
  }

  const hostSubdomain = params.host ? getSubdomainFromHost(params.host) : null;
  const orgIdentifier = params.orgIdentifier ?? hostSubdomain;
  const branchCode = params.branchCode;

  if (orgIdentifier && branchCode) {
    const organization = await getOrganizationByIdentifier(orgIdentifier);
    if (organization) {
      const companyBranch = await getRestaurantByCompanyAndBranch({
        organization,
        branchCode,
      });
      if (companyBranch) return companyBranch;
    }
  }

  const legacySubdomain = params.subdomain ?? hostSubdomain;
  if (legacySubdomain) {
    return getRestaurantByLegacySubdomain(legacySubdomain);
  }

  return null;
}

export async function resolveCustomerEntryContext(params: {
  host?: string | null;
  orgIdentifier?: string | null;
  branchCode?: string | null;
  tableCode?: string | null;
  restaurantId?: string | null;
  subdomain?: string | null;
}): Promise<CustomerEntryContext | null> {
  const restaurantContext = await resolvePublicRestaurantContext({
    host: params.host,
    orgIdentifier: params.orgIdentifier,
    branchCode: params.branchCode,
    restaurantId: params.restaurantId,
    subdomain: params.subdomain,
  });

  const normalizedTableCode = normalizePublicCode(params.tableCode);
  if (!restaurantContext || !normalizedTableCode) return null;

  const { data, error } = await supabaseAdmin.rpc('get_table_session_by_code', {
    input_code: normalizedTableCode,
    input_restaurant_id: restaurantContext.restaurant.id,
  });

  if (error || !Array.isArray(data) || data.length === 0) return null;

  const row = data[0] as {
    table_id: string;
    active_session_id: string | null;
    require_passcode: boolean;
  };

  return {
    ...restaurantContext,
    tableId: row.table_id,
    activeSessionId: row.active_session_id,
    requirePasscode: row.require_passcode,
  };
}
