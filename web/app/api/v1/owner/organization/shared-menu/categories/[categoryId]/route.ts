import { NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { syncOrganizationSharedMenuToBranches } from '@/lib/server/organizations/menu-inheritance';
import { organizationSharedMenuCategoryUpdateSchema } from '@/lib/server/organizations/schemas';
import {
  deleteOrganizationSharedCategory,
  updateOrganizationSharedCategory,
} from '@/lib/server/organizations/shared-menu';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can('restaurant_settings')) {
    return forbidden('Requires restaurant_settings permission');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = organizationSharedMenuCategoryUpdateSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: 'Invalid shared category payload', details: input.error.flatten() },
      { status: 400 },
    );
  }

  const { categoryId } = await params;
  const updatePayload = {
    ...(input.data.name_en !== undefined ? { name_en: input.data.name_en } : {}),
    ...(input.data.name_ja !== undefined
      ? { name_ja: input.data.name_ja || null }
      : {}),
    ...(input.data.name_vi !== undefined
      ? { name_vi: input.data.name_vi || null }
      : {}),
    ...(input.data.is_active !== undefined
      ? { is_active: input.data.is_active }
      : {}),
    ...(input.data.position !== undefined
      ? { position: input.data.position }
      : {}),
  };
  const category = await updateOrganizationSharedCategory(
    ctx!.organization.id,
    categoryId,
    updatePayload,
  );

  if (!category) {
    return NextResponse.json({ error: 'Failed to update shared category' }, { status: 500 });
  }

  await syncOrganizationSharedMenuToBranches({
    organizationId: ctx!.organization.id,
  });

  return NextResponse.json({ success: true, category });
}

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
