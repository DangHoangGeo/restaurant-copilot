// PATCH /api/v1/platform/restaurants/[id]/verify
// Verify a restaurant

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  requirePlatformAdmin,
  getPlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { verifyRestaurantSchema } from '@/shared/schemas/platform';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
){
  // Check platform admin authorization
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const {restaurantId} = await params;
    const body = await request.json();

    // Validate request body
    const validated = verifyRestaurantSchema.parse(body);

    const supabase = await createClient();
    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    // Call the verify_restaurant function
    const { data, error } = await supabase.rpc('verify_restaurant', {
      rest_id: restaurantId,
      admin_id: admin.id,
      notes: validated.notes || null
    });

    if (error) {
      console.error('Error verifying restaurant:', error);
      return platformApiError('Failed to verify restaurant', 500);
    }

    if (!data) {
      return platformApiError('Restaurant not found', 404);
    }

    // Log the action
    await logPlatformAction(
      'verify_restaurant',
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
      message: 'Restaurant verified successfully',
      data: restaurant
    });
  } catch (error) {
    console.error('Error in PATCH /platform/restaurants/:id/verify:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
