// PATCH /api/v1/platform/restaurants/[id]/verify
// Verify a restaurant

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  requirePlatformAdmin,
  getPlatformAdmin,
  platformApiResponse,
  platformApiError,
  logPlatformAction
} from '@/lib/platform-admin';
import { verifyRestaurantSchema } from '@/shared/schemas/platform';
import { approveOrganizationLifecycle } from '@/lib/server/platform/organization-approvals';

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

    // Validate request body
    const validated = verifyRestaurantSchema.parse(body);

    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    const { data: orgLink } = await supabaseAdmin
      .from('organization_restaurants')
      .select('organization_id')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (orgLink?.organization_id) {
      const approval = await approveOrganizationLifecycle(
        orgLink.organization_id,
        admin.id,
        validated.notes ?? null
      );

      if (!approval.success) {
        return platformApiError(approval.error ?? 'Failed to approve linked organization', 500);
      }
    } else {
      const { data: restaurant, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: admin.id,
          verification_notes: validated.notes || null,
        })
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) {
        console.error('Error verifying restaurant:', error);
        return platformApiError('Failed to verify restaurant', 500);
      }

      if (!restaurant) {
        return platformApiError('Restaurant not found', 404);
      }
    }

    await logPlatformAction('verify_restaurant', 'restaurant', restaurantId, restaurantId, {
      notes: validated.notes,
      organization_id: orgLink?.organization_id ?? null,
    });

    return platformApiResponse({
      success: true,
      message: orgLink?.organization_id
        ? 'Linked organization approved successfully'
        : 'Restaurant verified successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /platform/restaurants/:id/verify:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
