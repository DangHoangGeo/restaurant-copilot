// PATCH /api/v1/owner/organization/restaurants/[branchId]
// Update settings for a specific branch the caller has access to.
// Uses org context for access control — no active-branch cookie required.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  requirePermission,
} from '@/lib/server/authorization/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';

const branchSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      'Invalid email format'
    ),
  timezone: z.string().max(100).nullable().optional(),
  currency: z.enum(['JPY', 'USD', 'VND', 'SGD']).nullable().optional(),
  tax: z.number().min(0).max(1).nullable().optional(),
  default_language: z.enum(['ja', 'en', 'vi']).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;

  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const permError = requirePermission(authz, 'restaurant_settings');
  if (permError) return permError;

  // Verify caller can access this branch
  if (!ctx!.accessibleRestaurantIds.includes(branchId)) {
    return NextResponse.json({ error: 'Access denied to this branch' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = branchSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('restaurants')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', branchId)
    .select('id, name, subdomain, address, phone, email, timezone, currency, tax, default_language')
    .single();

  if (error) {
    await logger.error(
      'branch-settings-patch',
      'Failed to update branch settings',
      { error: error.message, branchId },
      branchId
    );
    return NextResponse.json({ error: 'Failed to update branch settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true, branch: updated });
}
