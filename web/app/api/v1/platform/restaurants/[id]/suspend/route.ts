// PATCH /api/v1/platform/restaurants/[id]/suspend
// Suspend or unsuspend a restaurant

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  requirePlatformAdmin,
  getPlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { suspendRestaurantSchema, unsuspendRestaurantSchema } from '@/shared/schemas/platform';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
){
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { id: restaurantId } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'suspend' or 'unsuspend'

    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    if (action === 'unsuspend') {
      const validated = unsuspendRestaurantSchema.parse(body);

      // Clear suspension fields directly with service role to bypass RLS
      const { data: restaurant, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          is_active: true,
          suspended_at: null,
          suspended_by: null,
          suspend_reason: null,
          suspend_notes: null,
        })
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) {
        console.error('Error unsuspending restaurant:', error);
        return platformApiError('Failed to unsuspend restaurant', 500);
      }

      if (!restaurant) {
        return platformApiError('Restaurant not found', 404);
      }

      // Restore subscription status: trial/active based on dates, else expired
      const now = new Date().toISOString();
      const { data: sub } = await supabaseAdmin
        .from('tenant_subscriptions')
        .select('trial_ends_at, current_period_end')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'paused')
        .maybeSingle();
      if (sub) {
        const newStatus =
          sub.trial_ends_at && sub.trial_ends_at > now
            ? 'trial'
            : sub.current_period_end && sub.current_period_end > now
              ? 'active'
              : 'expired';
        await supabaseAdmin
          .from('tenant_subscriptions')
          .update({ status: newStatus })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'paused');
      }

      await logPlatformAction('unsuspend_restaurant', 'restaurant', restaurantId, restaurantId, {
        notes: validated.notes,
      });

      return platformApiResponse({
        success: true,
        message: 'Restaurant unsuspended successfully',
        data: restaurant,
      });
    } else {
      const validated = suspendRestaurantSchema.parse(body);

      // Set suspension fields directly with service role to bypass RLS
      const { data: restaurant, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          is_active: false,
          suspended_at: new Date().toISOString(),
          suspended_by: admin.id,
          suspend_reason: validated.reason,
          suspend_notes: validated.notes || null,
        })
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) {
        console.error('Error suspending restaurant:', error);
        return platformApiError('Failed to suspend restaurant', 500);
      }

      if (!restaurant) {
        return platformApiError('Restaurant not found', 404);
      }

      // Pause active/trial subscriptions
      await supabaseAdmin
        .from('tenant_subscriptions')
        .update({ status: 'paused' })
        .eq('restaurant_id', restaurantId)
        .in('status', ['trial', 'active'])
        .catch(() => {
          // Best-effort — subscription update is non-critical
        });

      await logPlatformAction('suspend_restaurant', 'restaurant', restaurantId, restaurantId, {
        reason: validated.reason,
        notes: validated.notes,
      });

      return platformApiResponse({
        success: true,
        message: 'Restaurant suspended successfully',
        data: restaurant,
      });
    }
  } catch (error) {
    console.error('Error in PATCH /platform/restaurants/:id/suspend:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
