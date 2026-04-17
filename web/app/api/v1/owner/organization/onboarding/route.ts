import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { organizationOnboardingSchema } from '@/lib/server/organizations/schemas';
import { resolveOrgContext, updateOrganization } from '@/lib/server/organizations/service';

export async function POST(request: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden('Requires organization_settings permission');
  }

  if (ctx!.organization.approval_status !== 'approved') {
    return forbidden('Organization must be approved before onboarding can be completed');
  }

  try {
    const body = await request.json();
    const input = organizationOnboardingSchema.parse(body);

    const result = await updateOrganization(ctx!.organization.id, {
      name: input.name,
      country: input.country,
      timezone: input.timezone,
      currency: input.currency,
      logo_url: input.logo_url ?? null,
      brand_color: input.brand_color,
      website: input.website ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      description_en: input.description_en ?? null,
      description_ja: input.description_ja ?? null,
      description_vi: input.description_vi ?? null,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to save onboarding' }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: result.organization });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Organization onboarding save failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
