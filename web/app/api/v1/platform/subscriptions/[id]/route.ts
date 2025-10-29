// PATCH /api/v1/platform/subscriptions/[id]
// Update a tenant subscription

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validated.plan_id) {
      updateData.plan_id = validated.plan_id;

      // Fetch plan quotas and update cached values
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', validated.plan_id)
        .single();

      if (plan) {
        updateData.seat_limit = plan.max_staff_seats;
        updateData.storage_limit_gb = plan.max_storage_gb;
        updateData.ai_calls_limit = plan.max_ai_calls_per_month;
        updateData.customers_per_day_limit = plan.max_customers_per_day;
      }
    }

    if (validated.status) {
      updateData.status = validated.status;

      // If activating, set activated_at
      if (validated.status === 'active' && !currentSub.activated_at) {
        updateData.activated_at = new Date().toISOString();
      }

      // If canceling, set canceled_at
      if (validated.status === 'canceled' && !currentSub.canceled_at) {
        updateData.canceled_at = new Date().toISOString();
      }
    }

    if (validated.trial_ends_at) {
      updateData.trial_ends_at = validated.trial_ends_at;
    }

    if (validated.current_period_end) {
      updateData.current_period_end = validated.current_period_end;
    }

    if (validated.notes) {
      updateData.notes = validated.notes;
    }

    // Update subscription
    const { data: updatedSub, error } = await supabase
      .from('tenant_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
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
