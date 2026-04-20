import { NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { syncOrganizationSharedMenuToBranches } from '@/lib/server/organizations/menu-inheritance';
import { deleteOrganizationSharedCategory } from '@/lib/server/organizations/shared-menu';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can('restaurant_settings')) {
    return forbidden('Requires restaurant_settings permission');
  }

  const { categoryId } = await params;
  const success = await deleteOrganizationSharedCategory(ctx!.organization.id, categoryId);

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete shared category' }, { status: 500 });
  }

  await syncOrganizationSharedMenuToBranches({
    organizationId: ctx!.organization.id,
  });

  return NextResponse.json({ success: true });
}
