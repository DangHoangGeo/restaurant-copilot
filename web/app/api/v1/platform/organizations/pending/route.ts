import { requirePlatformAdmin, platformApiError, platformApiResponse } from '@/lib/platform-admin';
import { listPendingOrganizationApprovals } from '@/lib/server/platform/organization-approvals';

export async function GET() {
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const organizations = await listPendingOrganizationApprovals();
    return platformApiResponse({ data: organizations });
  } catch (error) {
    console.error('Error in GET /platform/organizations/pending:', error);
    return platformApiError('Failed to fetch pending organizations', 500);
  }
}
