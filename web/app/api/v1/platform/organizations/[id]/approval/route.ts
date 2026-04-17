import { NextRequest } from 'next/server';
import {
  getPlatformAdmin,
  logPlatformAction,
  platformApiError,
  platformApiResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { organizationApprovalSchema } from '@/shared/schemas/platform';
import {
  approveOrganizationLifecycle,
  rejectOrganizationLifecycle,
} from '@/lib/server/platform/organization-approvals';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { id: organizationId } = await params;
    const body = await request.json();
    const validated = organizationApprovalSchema.parse(body);
    const admin = await getPlatformAdmin();

    if (!admin) {
      return platformApiError('Platform admin not found', 403);
    }

    if (validated.status === 'approved') {
      const result = await approveOrganizationLifecycle(
        organizationId,
        admin.id,
        validated.notes ?? null
      );

      if (!result.success) {
        return platformApiError(result.error ?? 'Failed to approve organization', 500);
      }

      await logPlatformAction(
        'approve_organization',
        'owner_organization',
        organizationId,
        result.restaurantIds?.[0] ?? null ?? undefined,
        {
          notes: validated.notes ?? null,
          restaurant_ids: result.restaurantIds ?? [],
        }
      );

      return platformApiResponse({
        success: true,
        message: 'Organization approved successfully',
      });
    }

    const result = await rejectOrganizationLifecycle(
      organizationId,
      validated.notes ?? null
    );

    if (!result.success) {
      return platformApiError(result.error ?? 'Failed to reject organization', 500);
    }

    await logPlatformAction(
      'reject_organization',
      'owner_organization',
      organizationId,
      result.restaurantIds?.[0] ?? null ?? undefined,
      {
        notes: validated.notes ?? null,
        restaurant_ids: result.restaurantIds ?? [],
      }
    );

    return platformApiResponse({
      success: true,
      message: 'Organization rejected successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /platform/organizations/:id/approval:', error);
    if (error instanceof Error && 'issues' in error) {
      return platformApiError('Invalid request body', 400);
    }
    return platformApiError('Internal server error', 500);
  }
}
