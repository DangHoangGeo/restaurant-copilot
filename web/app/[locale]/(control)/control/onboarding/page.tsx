import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { ControlOnboardingContent } from './control-onboarding-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.settings' });
  return { title: `${t('title')} - Onboarding` };
}

export default async function ControlOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveOrgContext();

  if (!ctx) {
    redirect(`/${locale}/dashboard`);
  }

  if (ctx.organization.approval_status !== 'approved') {
    redirect(`/${locale}/signup/pending-approval?status=${ctx.organization.approval_status}&org=${encodeURIComponent(ctx.organization.public_subdomain || ctx.organization.slug)}`);
  }

  const authz = buildAuthorizationService(ctx);
  const canEdit = authz?.canChangeOrgSettings() ?? false;
  const org = ctx.organization;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Owner onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Finish the first company setup after approval so the control workspace and future homepage tools start from clean defaults.
        </p>
      </div>

      <ControlOnboardingContent
        locale={locale}
        initial={{
          name: org.name,
          publicSubdomain: org.public_subdomain,
          timezone: org.timezone,
          currency: org.currency,
          country: org.country ?? 'JP',
          logo_url: org.logo_url ?? null,
          brand_color: org.brand_color ?? '#EA580C',
          description_en: org.description_en ?? '',
          description_ja: org.description_ja ?? '',
          description_vi: org.description_vi ?? '',
          website: org.website ?? '',
          phone: org.phone ?? '',
          email: org.email ?? '',
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
