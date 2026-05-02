import { NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { syncOrganizationSharedMenuToBranches } from '@/lib/server/organizations/menu-inheritance';
import { organizationSharedMenuItemUpdateSchema } from '@/lib/server/organizations/schemas';
import {
  deleteOrganizationSharedMenuItem,
  updateOrganizationSharedMenuItem,
} from '@/lib/server/organizations/shared-menu';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
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

  const input = organizationSharedMenuItemUpdateSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: 'Invalid shared item payload', details: input.error.flatten() },
      { status: 400 },
    );
  }

  const { itemId } = await params;
  const updatePayload = {
    ...(input.data.category_id !== undefined
      ? { category_id: input.data.category_id }
      : {}),
    ...(input.data.name_en !== undefined ? { name_en: input.data.name_en } : {}),
    ...(input.data.name_ja !== undefined
      ? { name_ja: input.data.name_ja || null }
      : {}),
    ...(input.data.name_vi !== undefined
      ? { name_vi: input.data.name_vi || null }
      : {}),
    ...(input.data.description_en !== undefined
      ? { description_en: input.data.description_en || null }
      : {}),
    ...(input.data.description_ja !== undefined
      ? { description_ja: input.data.description_ja || null }
      : {}),
    ...(input.data.description_vi !== undefined
      ? { description_vi: input.data.description_vi || null }
      : {}),
    ...(input.data.price !== undefined ? { price: input.data.price } : {}),
    ...(input.data.tags !== undefined ? { tags: input.data.tags } : {}),
    ...(input.data.prep_station !== undefined
      ? { prep_station: input.data.prep_station }
      : {}),
    ...(input.data.image_url !== undefined
      ? { image_url: input.data.image_url ?? null }
      : {}),
    ...(input.data.available !== undefined
      ? { available: input.data.available }
      : {}),
    ...(input.data.weekday_visibility !== undefined
      ? { weekday_visibility: input.data.weekday_visibility }
      : {}),
    ...(input.data.stock_level !== undefined
      ? { stock_level: input.data.stock_level }
      : {}),
    ...(input.data.position !== undefined ? { position: input.data.position } : {}),
    ...(input.data.sizes !== undefined ? { sizes: input.data.sizes } : {}),
    ...(input.data.toppings !== undefined ? { toppings: input.data.toppings } : {}),
  };
  const item = await updateOrganizationSharedMenuItem(
    ctx!.organization.id,
    itemId,
    updatePayload,
  );

  if (!item) {
    return NextResponse.json({ error: 'Failed to update shared item' }, { status: 500 });
  }

  await syncOrganizationSharedMenuToBranches({
    organizationId: ctx!.organization.id,
  });

  return NextResponse.json({ success: true, item });
}

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

  await syncOrganizationSharedMenuToBranches({
    organizationId: ctx!.organization.id,
  });

  return NextResponse.json({ success: true });
}
