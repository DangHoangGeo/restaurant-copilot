import "server-only";

import { PRICING_CONFIG } from "@/config/pricing";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SubscriptionReceipt, TenantSubscription } from "@/shared/types/platform";

export type BillingCycle = "monthly" | "yearly";
export type ManagedSubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "expired";

export interface BillingPlanRow {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_customers_per_day: number | null;
  max_staff_seats: number | null;
  max_storage_gb: number | null;
  max_ai_calls_per_month: number | null;
}

export interface OrganizationBillingSummary {
  organizationId: string;
  restaurantId: string;
  restaurantName: string;
  subscription: TenantSubscription | null;
  planName: string | null;
  receipts: SubscriptionReceipt[];
}

function addBillingPeriod(startDate: Date, billingCycle: BillingCycle): Date {
  const next = new Date(startDate);
  if (billingCycle === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
}

function buildReceiptNumber(subscriptionId: string, periodStartIso: string): string {
  const dateSegment = periodStartIso.slice(0, 10).replace(/-/g, "");
  return `SUB-${dateSegment}-${subscriptionId.slice(0, 8).toUpperCase()}`;
}

function normalizeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

export async function loadBillingPlan(
  planId: string,
): Promise<BillingPlanRow | null> {
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select(
      "id, name, price_monthly, price_yearly, max_customers_per_day, max_staff_seats, max_storage_gb, max_ai_calls_per_month",
    )
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load billing plan:", error);
    return null;
  }

  return {
    ...data,
    price_monthly: normalizeNumber(data.price_monthly),
    price_yearly: normalizeNumber(data.price_yearly),
  } as BillingPlanRow;
}

async function resolveOrganizationIdForRestaurant(
  restaurantId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("organization_restaurants")
    .select("organization_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return data?.organization_id ?? null;
}

export async function ensureSubscriptionReceipt(params: {
  subscriptionId: string;
  restaurantId: string;
  plan: BillingPlanRow;
  billingCycle: BillingCycle;
  status: ManagedSubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  notes?: string | null;
}): Promise<boolean> {
  if (!["active", "past_due", "canceled"].includes(params.status)) {
    return true;
  }

  const organizationId = await resolveOrganizationIdForRestaurant(params.restaurantId);
  const amount =
    params.billingCycle === "yearly"
      ? params.plan.price_yearly
      : params.plan.price_monthly;

  const receipt: Omit<SubscriptionReceipt, "id" | "created_at" | "updated_at"> = {
    subscription_id: params.subscriptionId,
    organization_id: organizationId,
    restaurant_id: params.restaurantId,
    receipt_number: buildReceiptNumber(
      params.subscriptionId,
      params.currentPeriodStart,
    ),
    plan_id: params.plan.id,
    billing_cycle: params.billingCycle,
    currency: PRICING_CONFIG.currency,
    subtotal: amount,
    total: amount,
    status: params.status === "past_due" ? "issued" : "paid",
    period_start: params.currentPeriodStart,
    period_end: params.currentPeriodEnd,
    issued_at: new Date().toISOString(),
    paid_at: params.status === "past_due" ? null : new Date().toISOString(),
    notes: params.notes ?? null,
  };

  const { error } = await supabaseAdmin
    .from("subscription_receipts")
    .upsert(receipt, {
      onConflict: "subscription_id,period_start,period_end",
    });

  if (error) {
    console.error("Failed to upsert subscription receipt:", error);
    return false;
  }

  return true;
}

export async function upsertTenantSubscription(params: {
  restaurantId: string;
  plan: BillingPlanRow;
  billingCycle: BillingCycle;
  status: ManagedSubscriptionStatus;
  trialDays?: number;
  notes?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string | null;
}): Promise<TenantSubscription | null> {
  const now = new Date();
  const currentPeriodStart = params.currentPeriodStart ?? now.toISOString();
  const currentPeriodStartDate = new Date(currentPeriodStart);
  const trialDays = params.trialDays ?? 0;
  const currentPeriodEnd =
    params.currentPeriodEnd ??
    (params.status === "trial"
      ? new Date(
          currentPeriodStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : addBillingPeriod(currentPeriodStartDate, params.billingCycle).toISOString());
  const trialEndsAt =
    params.status === "trial"
      ? (params.trialEndsAt ?? currentPeriodEnd)
      : null;

  const { data: existingSubscription } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("*")
    .eq("restaurant_id", params.restaurantId)
    .maybeSingle();

  const payload = {
    plan_id: params.plan.id,
    status: params.status,
    billing_cycle: params.billingCycle,
    trial_starts_at: params.status === "trial" ? currentPeriodStart : null,
    trial_ends_at: trialEndsAt,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    billing_provider: params.status === "trial" ? "none" : "manual",
    seat_limit: params.plan.max_staff_seats,
    storage_limit_gb: params.plan.max_storage_gb,
    ai_calls_limit: params.plan.max_ai_calls_per_month,
    customers_per_day_limit: params.plan.max_customers_per_day,
    activated_at:
      params.status === "active"
        ? existingSubscription?.activated_at ?? now.toISOString()
        : existingSubscription?.activated_at ?? null,
    canceled_at:
      params.status === "canceled"
        ? existingSubscription?.canceled_at ?? now.toISOString()
        : null,
    cancellation_reason:
      params.status === "canceled" ? "Canceled by platform admin" : null,
    notes: params.notes ?? null,
  };

  const { data, error } = existingSubscription?.id
    ? await supabaseAdmin
        .from("tenant_subscriptions")
        .update(payload)
        .eq("id", existingSubscription.id)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("tenant_subscriptions")
        .insert({
          restaurant_id: params.restaurantId,
          ...payload,
        })
        .select("*")
        .single();

  if (error || !data) {
    console.error("Failed to upsert tenant subscription:", error);
    return null;
  }

  const subscription = data as TenantSubscription;
  const receiptOk = await ensureSubscriptionReceipt({
    subscriptionId: subscription.id,
    restaurantId: params.restaurantId,
    plan: params.plan,
    billingCycle: params.billingCycle,
    status: params.status,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    notes: params.notes ?? null,
  });

  if (!receiptOk) {
    return null;
  }

  return subscription;
}

export async function getOrganizationBillingSummary(
  organizationId: string,
): Promise<OrganizationBillingSummary | null> {
  const { data: organizationRestaurant } = await supabaseAdmin
    .from("organization_restaurants")
    .select("restaurant_id, restaurants(name)")
    .eq("organization_id", organizationId)
    .order("added_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!organizationRestaurant?.restaurant_id) {
    return null;
  }

  const restaurantRelation = organizationRestaurant as {
    restaurant_id: string;
    restaurants:
      | { name: string | null }
      | Array<{ name: string | null }>
      | null;
  };
  const restaurantName = Array.isArray(restaurantRelation.restaurants)
    ? restaurantRelation.restaurants[0]?.name
    : restaurantRelation.restaurants?.name;

  const { data: subscription } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("*, subscription_plans(name)")
    .eq("restaurant_id", organizationRestaurant.restaurant_id)
    .maybeSingle();

  const subscriptionRow = subscription as
    | (TenantSubscription & {
        subscription_plans:
          | { name: string | null }
          | Array<{ name: string | null }>
          | null;
      })
    | null;

  const { data: receipts } = await supabaseAdmin
    .from("subscription_receipts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("issued_at", { ascending: false })
    .limit(12);

  return {
    organizationId,
    restaurantId: organizationRestaurant.restaurant_id,
    restaurantName: restaurantName ?? "Primary branch",
    subscription: (subscriptionRow as TenantSubscription | null) ?? null,
    planName: Array.isArray(subscriptionRow?.subscription_plans)
      ? subscriptionRow?.subscription_plans[0]?.name ?? null
      : subscriptionRow?.subscription_plans?.name ?? null,
    receipts: (receipts as SubscriptionReceipt[] | null) ?? [],
  };
}

export async function getOrganizationReceipt(
  organizationId: string,
  receiptId: string,
): Promise<SubscriptionReceipt | null> {
  const { data, error } = await supabaseAdmin
    .from("subscription_receipts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", receiptId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as SubscriptionReceipt;
}
