import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ControlSettingsContent } from './control-settings-content';
import { buildAuthorizationService } from '@/lib/server/authorization/service';
import { resolveFounderControlContext } from '@/lib/server/control/access';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.settings' });
  return { title: t('title') };
}

export default async function ControlSettingsPage({
  params: _params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const ctx = await resolveFounderControlContext();
  if (!ctx) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  const canEdit = authz?.canChangeOrgSettings() ?? false;
  const org = ctx.organization;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide configuration and shared brand. Restaurant-specific settings live inside each restaurant.
        </p>
      </div>

      <ControlSettingsContent
        initial={{
          name: org.name,
          timezone: org.timezone,
          currency: org.currency,
          country: org.country ?? 'JP',
          logo_url: org.logo_url ?? null,
          brand_color: org.brand_color ?? null,
          description_en: org.description_en ?? null,
          description_ja: org.description_ja ?? null,
          description_vi: org.description_vi ?? null,
          website: org.website ?? null,
          phone: org.phone ?? null,
          email: org.email ?? null,
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
