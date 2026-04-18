// PATCH /api/v1/platform/subscriptions/[id]
// Update a tenant subscription

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  loadBillingPlan,
  upsertTenantSubscription,
} from '@/lib/server/billing/subscriptions';
import {
  requirePlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { updateSubscriptionSchema } from '@/shared/schemas/platform';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
){
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { subscriptionId } = await params;
    const body = await request.json();

    // Validate request body
    const validated = updateSubscriptionSchema.parse(body);

    const supabase = await createClient();

    // Get current subscription for audit log
    const { data: currentSub } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!currentSub) {
      return platformApiError('Subscription not found', 404);
    }

    const targetPlanId = validated.plan_id ?? currentSub.plan_id;
    const targetPlan = await loadBillingPlan(targetPlanId);

    if (!targetPlan) {
      return platformApiError('Subscription plan not found', 404);
    }

    const status = validated.status ?? currentSub.status;
    const billingCycle = validated.billing_cycle ?? currentSub.billing_cycle;
    const currentPeriodStart =
      validated.current_period_start ?? currentSub.current_period_start;
    const currentPeriodEnd =
      validated.current_period_end ?? currentSub.current_period_end;
    const trialEndsAt =
      validated.trial_ends_at ?? currentSub.trial_ends_at ?? null;
    const trialDays =
      status === 'trial' && trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(trialEndsAt).getTime() -
                new Date(currentPeriodStart).getTime()) /
                (24 * 60 * 60 * 1000)
            )
          )
        : 0;

    const updatedSub = await upsertTenantSubscription({
      restaurantId: currentSub.restaurant_id,
      plan: targetPlan,
      billingCycle,
      status,
      trialDays,
      notes: validated.notes ?? currentSub.notes ?? null,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
    });

    if (!updatedSub) {
      return platformApiError('Failed to update subscription', 500);
    }

    // Log the action
    await logPlatformAction(
      'update_subscription',
      'tenant_subscription',
      subscriptionId,
      currentSub.restaurant_id,
      {
        before: currentSub,
        after: updatedSub,
        changes: validated
      }
    );

    return platformApiResponse({
      success: true,
      message: 'Subscription updated successfully',
      data: updatedSub
    });
  } catch (error) {
    console.error('Error in PATCH /platform/subscriptions/:id:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
