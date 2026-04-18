import { PRICING_CONFIG } from '@/config/pricing';
import {
  loadBillingPlan,
  upsertTenantSubscription,
  type BillingCycle,
} from '@/lib/server/billing/subscriptions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface PendingOrganizationApprovalSummary {
  id: string;
  name: string;
  public_subdomain: string;
  requested_plan: string | null;
  requested_billing_cycle: BillingCycle | null;
  created_at: string;
  founder_email: string | null;
  founder_name: string | null;
  branch_count: number;
  primary_branch_name: string | null;
  primary_branch_subdomain: string | null;
}

type ApprovalRestaurant = {
  id: string;
  name: string;
  subdomain: string;
};

async function resolveOrganizationRestaurants(
  organizationId: string
): Promise<ApprovalRestaurant[]> {
  const { data: links } = await supabaseAdmin
    .from('organization_restaurants')
    .select('restaurant_id')
    .eq('organization_id', organizationId);

  let restaurantIds = (links ?? []).map((row) => row.restaurant_id);

  if (restaurantIds.length === 0) {
    const { data: organization } = await supabaseAdmin
      .from('owner_organizations')
      .select('created_by')
      .eq('id', organizationId)
      .maybeSingle();

    if (organization?.created_by) {
      const { data: founderUser } = await supabaseAdmin
        .from('users')
        .select('restaurant_id')
        .eq('id', organization.created_by)
        .maybeSingle();

      if (founderUser?.restaurant_id) {
        restaurantIds = [founderUser.restaurant_id];
        await supabaseAdmin
          .from('organization_restaurants')
          .insert({
            organization_id: organizationId,
            restaurant_id: founderUser.restaurant_id,
            added_by: organization.created_by,
          });
      }
    }
  }

  if (restaurantIds.length === 0) {
    return [];
  }

  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, subdomain')
    .in('id', restaurantIds);

  return (restaurants ?? []) as ApprovalRestaurant[];
}

export async function listPendingOrganizationApprovals(): Promise<PendingOrganizationApprovalSummary[]> {
  const { data: organizations, error } = await supabaseAdmin
    .from('owner_organizations')
    .select('id, name, public_subdomain, requested_plan, requested_billing_cycle, created_at, created_by')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !organizations) {
    console.error('Failed to list pending organization approvals:', error);
    return [];
  }

  const creatorIds = organizations.map((organization) => organization.created_by).filter(Boolean);
  const organizationIds = organizations.map((organization) => organization.id);

  const [{ data: founders }, { data: links }] = await Promise.all([
    creatorIds.length > 0
      ? supabaseAdmin
          .from('users')
          .select('id, email, name, restaurant_id')
          .in('id', creatorIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from('organization_restaurants')
      .select('organization_id, restaurant_id')
      .in('organization_id', organizationIds),
  ]);

  const founderMap = new Map((founders ?? []).map((founder) => [founder.id, founder]));
  const linkedRestaurantIds = (links ?? []).map((link) => link.restaurant_id);
  const fallbackRestaurantIds = (founders ?? [])
    .map((founder) => founder.restaurant_id)
    .filter(Boolean) as string[];
  const uniqueRestaurantIds = Array.from(new Set([...linkedRestaurantIds, ...fallbackRestaurantIds]));

  const { data: restaurants } = uniqueRestaurantIds.length > 0
    ? await supabaseAdmin
        .from('restaurants')
        .select('id, name, subdomain')
        .in('id', uniqueRestaurantIds)
    : { data: [] };

  const restaurantMap = new Map((restaurants ?? []).map((restaurant) => [restaurant.id, restaurant]));
  const linksByOrganization = new Map<string, string[]>();

  for (const link of links ?? []) {
    const current = linksByOrganization.get(link.organization_id) ?? [];
    current.push(link.restaurant_id);
    linksByOrganization.set(link.organization_id, current);
  }

  return organizations.map((organization) => {
    const founder = founderMap.get(organization.created_by);
    const linkedIds = linksByOrganization.get(organization.id) ?? [];
    const effectiveRestaurantIds =
      linkedIds.length > 0
        ? linkedIds
        : founder?.restaurant_id
          ? [founder.restaurant_id]
          : [];
    const primaryRestaurant = effectiveRestaurantIds.length > 0
      ? restaurantMap.get(effectiveRestaurantIds[0]) ?? null
      : null;

    return {
      id: organization.id,
      name: organization.name,
      public_subdomain: organization.public_subdomain,
      requested_plan: organization.requested_plan ?? 'starter',
      requested_billing_cycle: organization.requested_billing_cycle ?? 'monthly',
      created_at: organization.created_at,
      founder_email: founder?.email ?? null,
      founder_name: founder?.name ?? null,
      branch_count: effectiveRestaurantIds.length,
      primary_branch_name: primaryRestaurant?.name ?? null,
      primary_branch_subdomain: primaryRestaurant?.subdomain ?? null,
    };
  });
}

export async function approveOrganizationLifecycle(
  organizationId: string,
  adminId: string,
  options: {
    notes: string | null;
    planId?: string;
    billingCycle?: BillingCycle;
    trialDays?: number;
  }
): Promise<{ success: boolean; error?: string; restaurantIds?: string[] }> {
  const { data: organization } = await supabaseAdmin
    .from('owner_organizations')
    .select('id, requested_plan, requested_billing_cycle')
    .eq('id', organizationId)
    .maybeSingle();

  if (!organization) {
    return { success: false, error: 'Organization not found' };
  }

  const restaurants = await resolveOrganizationRestaurants(organizationId);
  if (restaurants.length === 0) {
    return { success: false, error: 'Organization has no linked restaurants to approve' };
  }

  const planId = options.planId ?? organization.requested_plan ?? 'starter';
  const billingCycle = options.billingCycle ?? organization.requested_billing_cycle ?? 'monthly';
  const trialDays = options.trialDays ?? PRICING_CONFIG.trialDays;
  const plan = await loadBillingPlan(planId);
  if (!plan) {
    return { success: false, error: 'Requested subscription plan is missing' };
  }

  const nowIso = new Date().toISOString();

  const { error: organizationError } = await supabaseAdmin
    .from('owner_organizations')
    .update({
      approval_status: 'approved',
      approved_at: nowIso,
      approved_by: adminId,
      approval_notes: options.notes,
      requested_plan: planId,
      requested_billing_cycle: billingCycle,
      updated_at: nowIso,
    })
    .eq('id', organizationId);

  if (organizationError) {
    console.error('Failed to approve organization:', organizationError);
    return { success: false, error: 'Failed to approve organization' };
  }

  const restaurantIds = restaurants.map((restaurant) => restaurant.id);
  const { error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .update({
      is_verified: true,
      is_active: true,
      suspended_at: null,
      suspended_by: null,
      suspend_reason: null,
      suspend_notes: null,
      verified_at: nowIso,
      verified_by: adminId,
      verification_notes: options.notes,
    })
    .in('id', restaurantIds);

  if (restaurantError) {
    console.error('Failed to verify linked restaurants during org approval:', restaurantError);
    return { success: false, error: 'Organization approved but restaurant verification failed' };
  }

  for (const restaurantId of restaurantIds) {
    const subscription = await upsertTenantSubscription({
      restaurantId,
      plan,
      billingCycle,
      status: trialDays > 0 ? 'trial' : 'active',
      trialDays,
      notes:
        options.notes ??
        (trialDays > 0
          ? `Approved organization trial (${trialDays} days)`
          : 'Approved organization paid subscription'),
    });
    if (!subscription) {
      return { success: false, error: 'Organization approved but trial subscription setup failed' };
    }
  }

  return { success: true, restaurantIds };
}

export async function rejectOrganizationLifecycle(
  organizationId: string,
  reason: string | null
): Promise<{ success: boolean; error?: string; restaurantIds?: string[] }> {
  const restaurants = await resolveOrganizationRestaurants(organizationId);
  const restaurantIds = restaurants.map((restaurant) => restaurant.id);
  const nowIso = new Date().toISOString();

  const { error: organizationError } = await supabaseAdmin
    .from('owner_organizations')
    .update({
      approval_status: 'rejected',
      approved_at: null,
      approved_by: null,
      approval_notes: reason,
      updated_at: nowIso,
    })
    .eq('id', organizationId);

  if (organizationError) {
    console.error('Failed to reject organization:', organizationError);
    return { success: false, error: 'Failed to reject organization' };
  }

  if (restaurantIds.length > 0) {
    const { error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .update({
        is_verified: false,
        verified_at: null,
        verified_by: null,
        verification_notes: reason,
      })
      .in('id', restaurantIds);

    if (restaurantError) {
      console.error('Failed to reset linked restaurants during org rejection:', restaurantError);
      return { success: false, error: 'Organization rejected but linked restaurants were not updated' };
    }
  }

  return { success: true, restaurantIds };
}
