import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const JOB_TITLES = ['manager', 'chef', 'server', 'cashier'] as const;

const rolePayRateSchema = z.object({
  rates: z.array(
    z.object({
      job_title: z.enum(JOB_TITLES),
      hourly_rate: z.number().min(0),
      currency: z.string().length(3).optional(),
    })
  ),
});

// GET — return existing hourly rates for all four job titles for this branch.
// Titles with no stored rate are returned with hourly_rate: null so the
// editing form can show them as "not configured".
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const canRead =
    authz?.can('finance_exports') ||
    authz?.can('restaurant_settings') ||
    authz?.can('reports') ||
    false;

  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!ctx!.accessibleRestaurantIds.includes(branchId)) {
    return NextResponse.json({ error: 'Access denied to this branch' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('restaurant_role_pay_rates')
    .select('job_title, hourly_rate, currency')
    .eq('restaurant_id', branchId);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch role pay rates' }, { status: 500 });
  }

  const stored = new Map((data ?? []).map((r) => [r.job_title, r]));
  const currency = ctx!.organization.currency ?? 'JPY';

  const rates = JOB_TITLES.map((title) => {
    const row = stored.get(title);
    return {
      job_title: title,
      hourly_rate: row ? Number(row.hourly_rate) : null,
      currency: row?.currency ?? currency,
    };
  });

  return NextResponse.json({ rates, currency });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const canManageRates =
    authz?.can('finance_exports') || authz?.can('restaurant_settings') || false;

  if (!canManageRates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!ctx!.accessibleRestaurantIds.includes(branchId)) {
    return NextResponse.json({ error: 'Access denied to this branch' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = rolePayRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const rows = parsed.data.rates.map((rate) => ({
    restaurant_id: branchId,
    job_title: rate.job_title,
    hourly_rate: rate.hourly_rate,
    currency: rate.currency ?? ctx!.organization.currency ?? 'JPY',
    updated_at: new Date().toISOString(),
    updated_by: ctx!.member.user_id,
  }));

  const { error } = await supabaseAdmin
    .from('restaurant_role_pay_rates')
    .upsert(rows, { onConflict: 'restaurant_id,job_title' });

  if (error) {
    return NextResponse.json({ error: 'Failed to save role pay rates' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
