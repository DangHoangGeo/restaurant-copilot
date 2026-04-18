import { NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { deleteOrganizationSharedMenuItem } from '@/lib/server/organizations/shared-menu';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can('restaurant_settings')) {
    return forbidden('Requires restaurant_settings permission');
  }

  const { itemId } = await params;
  const success = await deleteOrganizationSharedMenuItem(ctx!.organization.id, itemId);

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete shared item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
