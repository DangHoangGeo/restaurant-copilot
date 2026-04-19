import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { TenantSubscription } from "@/shared/types/platform";
import {
  loadBillingPlan,
  upsertTenantSubscription,
} from "@/lib/server/billing/subscriptions";

type RenewableSubscriptionStatus = "trial" | "active" | "past_due";

export interface SubscriptionRenewalResult {
  subscriptionId: string;
  restaurantId: string;
  status: "renewed" | "skipped" | "failed";
  renewedPeriods: number;
  activatedFromTrial: boolean;
  error?: string;
}

export interface SubscriptionRenewalRunSummary {
  processed: number;
  renewed: number;
  failed: number;
  results: SubscriptionRenewalResult[];
  runAt: string;
}

function isDue(subscription: TenantSubscription, runAt: Date): boolean {
  return new Date(subscription.current_period_end).getTime() <= runAt.getTime();
}

function isRenewableStatus(
  status: TenantSubscription["status"],
): status is RenewableSubscriptionStatus {
  return status === "trial" || status === "active" || status === "past_due";
}

async function renewSingleSubscription(
  subscription: TenantSubscription,
  runAt: Date,
): Promise<SubscriptionRenewalResult> {
  if (!isRenewableStatus(subscription.status) || !isDue(subscription, runAt)) {
    return {
      subscriptionId: subscription.id,
      restaurantId: subscription.restaurant_id,
      status: "skipped",
      renewedPeriods: 0,
      activatedFromTrial: false,
    };
  }

  const plan = await loadBillingPlan(subscription.plan_id);
  if (!plan) {
    return {
      subscriptionId: subscription.id,
      restaurantId: subscription.restaurant_id,
      status: "failed",
      renewedPeriods: 0,
      activatedFromTrial: false,
      error: "Subscription plan not found",
    };
  }

  let current = subscription;
  let renewedPeriods = 0;
  let activatedFromTrial = false;
  let guard = 0;

  while (guard < 24 && isRenewableStatus(current.status) && isDue(current, runAt)) {
    const nextPeriodStart = current.current_period_end;
    const nextStatus = current.status === "trial" ? "active" : current.status;

    const next = await upsertTenantSubscription({
      restaurantId: current.restaurant_id,
      plan,
      billingCycle: current.billing_cycle,
      status: nextStatus,
      notes: current.notes ?? null,
      currentPeriodStart: nextPeriodStart,
    });

    if (!next) {
      return {
        subscriptionId: subscription.id,
        restaurantId: subscription.restaurant_id,
        status: "failed",
        renewedPeriods,
        activatedFromTrial,
        error: "Failed to advance subscription billing period",
      };
    }

    current = next;
    renewedPeriods += 1;
    activatedFromTrial = activatedFromTrial || subscription.status === "trial";
    guard += 1;
  }

  return {
    subscriptionId: subscription.id,
    restaurantId: subscription.restaurant_id,
    status: renewedPeriods > 0 ? "renewed" : "skipped",
    renewedPeriods,
    activatedFromTrial,
  };
}

export async function runSubscriptionRenewals(
  runAt: Date = new Date(),
): Promise<SubscriptionRenewalRunSummary> {
  const runAtIso = runAt.toISOString();
  const { data, error } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("*")
    .in("status", ["trial", "active", "past_due"])
    .lte("current_period_end", runAtIso)
    .order("current_period_end", { ascending: true })
    .limit(200);

  if (error) {
    return {
      processed: 0,
      renewed: 0,
      failed: 1,
      results: [
        {
          subscriptionId: "query-error",
          restaurantId: "unknown",
          status: "failed",
          renewedPeriods: 0,
          activatedFromTrial: false,
          error: error.message,
        },
      ],
      runAt: runAtIso,
    };
  }

  const results: SubscriptionRenewalResult[] = [];
  for (const row of (data ?? []) as TenantSubscription[]) {
    results.push(await renewSingleSubscription(row, runAt));
  }

  return {
    processed: results.length,
    renewed: results.filter((item) => item.status === "renewed").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
    runAt: runAtIso,
  };
}
