import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface PendingOrganizationApprovalSummary {
  id: string;
  name: string;
  public_subdomain: string;
  requested_plan: string | null;
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

type SubscriptionPlanRow = {
  id: string;
  max_staff_seats: number | null;
  max_storage_gb: number | null;
  max_ai_calls_per_month: number | null;
  max_customers_per_day: number | null;
};

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

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

async function loadSubscriptionPlan(planId: string): Promise<SubscriptionPlanRow | null> {
  const { data: plan, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, max_staff_seats, max_storage_gb, max_ai_calls_per_month, max_customers_per_day')
    .eq('id', planId)
    .maybeSingle();

  if (error || !plan) {
    console.error('Failed to load subscription plan for org approval:', error);
    return null;
  }

  return plan as SubscriptionPlanRow;
}

async function ensureTrialSubscription(
  restaurantId: string,
  plan: SubscriptionPlanRow,
  notes: string | null
): Promise<boolean> {
  const now = new Date();
  const trialEndsAt = addMonths(now, 6);
  const nowIso = now.toISOString();
  const trialEndsAtIso = trialEndsAt.toISOString();

  const payload = {
    plan_id: plan.id,
    status: 'trial',
    billing_cycle: 'monthly',
    trial_starts_at: nowIso,
    trial_ends_at: trialEndsAtIso,
    current_period_start: nowIso,
    current_period_end: trialEndsAtIso,
    seat_limit: plan.max_staff_seats,
    storage_limit_gb: plan.max_storage_gb,
    ai_calls_limit: plan.max_ai_calls_per_month,
    customers_per_day_limit: plan.max_customers_per_day,
    activated_at: null,
    canceled_at: null,
    cancellation_reason: null,
    notes: notes ?? 'Approved organization starter trial',
  };

  const { data: existingSubscription } = await supabaseAdmin
    .from('tenant_subscriptions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSubscription?.id) {
    const { error } = await supabaseAdmin
      .from('tenant_subscriptions')
      .update(payload)
      .eq('id', existingSubscription.id);

    if (error) {
      console.error('Failed to update trial subscription for restaurant:', error);
      return false;
    }

    return true;
  }

  const { error } = await supabaseAdmin
    .from('tenant_subscriptions')
    .insert({
      restaurant_id: restaurantId,
      ...payload,
    });

  if (error) {
    console.error('Failed to create trial subscription for restaurant:', error);
    return false;
  }

  return true;
}

export async function listPendingOrganizationApprovals(): Promise<PendingOrganizationApprovalSummary[]> {
  const { data: organizations, error } = await supabaseAdmin
    .from('owner_organizations')
    .select('id, name, public_subdomain, requested_plan, created_at, created_by')
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
  notes: string | null
): Promise<{ success: boolean; error?: string; restaurantIds?: string[] }> {
  const { data: organization } = await supabaseAdmin
    .from('owner_organizations')
    .select('id, requested_plan')
    .eq('id', organizationId)
    .maybeSingle();

  if (!organization) {
    return { success: false, error: 'Organization not found' };
  }

  const restaurants = await resolveOrganizationRestaurants(organizationId);
  if (restaurants.length === 0) {
    return { success: false, error: 'Organization has no linked restaurants to approve' };
  }

  const plan = await loadSubscriptionPlan(organization.requested_plan ?? 'starter');
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
      approval_notes: notes,
      requested_plan: organization.requested_plan ?? 'starter',
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
      verification_notes: notes,
    })
    .in('id', restaurantIds);

  if (restaurantError) {
    console.error('Failed to verify linked restaurants during org approval:', restaurantError);
    return { success: false, error: 'Organization approved but restaurant verification failed' };
  }

  for (const restaurantId of restaurantIds) {
    const ok = await ensureTrialSubscription(
      restaurantId,
      plan,
      notes ?? 'Approved organization starter trial (6 months)'
    );
    if (!ok) {
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
