// PATCH /api/v1/platform/restaurants/[id]/suspend
// Suspend or unsuspend a restaurant

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  { params }: { params: { id: string } }
) {
  // Check platform admin authorization
  const authError = await requirePlatformAdmin(request);
  if (authError) return authError;

  try {
    const restaurantId = params.id;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'suspend' or 'unsuspend'

    const supabase = await createClient();
    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    if (action === 'unsuspend') {
      // Validate unsuspend request
      const validated = unsuspendRestaurantSchema.parse(body);

      // Call the unsuspend_restaurant function
      const { data, error } = await supabase.rpc('unsuspend_restaurant', {
        rest_id: restaurantId
      });

      if (error) {
        console.error('Error unsuspending restaurant:', error);
        return platformApiError('Failed to unsuspend restaurant', 500);
      }

      if (!data) {
        return platformApiError('Restaurant not found', 404);
      }

      // Log the action
      await logPlatformAction(
        'unsuspend_restaurant',
        'restaurant',
        restaurantId,
        restaurantId,
        {
          notes: validated.notes
        }
      );

      // Fetch updated restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      return platformApiResponse({
        success: true,
        message: 'Restaurant unsuspended successfully',
        data: restaurant
      });
    } else {
      // Default action is suspend
      // Validate suspend request
      const validated = suspendRestaurantSchema.parse(body);

      // Call the suspend_restaurant function
      const { data, error } = await supabase.rpc('suspend_restaurant', {
        rest_id: restaurantId,
        admin_id: admin.id,
        reason: validated.reason,
        notes: validated.notes || null
      });

      if (error) {
        console.error('Error suspending restaurant:', error);
        return platformApiError('Failed to suspend restaurant', 500);
      }

      if (!data) {
        return platformApiError('Restaurant not found', 404);
      }

      // Log the action
      await logPlatformAction(
        'suspend_restaurant',
        'restaurant',
        restaurantId,
        restaurantId,
        {
          reason: validated.reason,
          notes: validated.notes
        }
      );

      // Fetch updated restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      return platformApiResponse({
        success: true,
        message: 'Restaurant suspended successfully',
        data: restaurant
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
