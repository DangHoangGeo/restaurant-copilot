import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { ControlOverviewClient } from '@/components/features/admin/control/control-overview-client';
import { resolveFounderControlContext } from '@/lib/server/control/access';
import { getFounderControlOverview } from '@/lib/server/control/overview';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.control' });
  return { title: t('overview.title') };
}

export default async function ControlOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();

  if (!ctx) {
    notFound();
  }

  if (!ctx.organization.onboarding_completed_at) {
    redirect(`/${locale}/control/onboarding`);
  }

  const data = await getFounderControlOverview({
    organizationId: ctx.organization.id,
    accessibleRestaurantIds: ctx.accessibleRestaurantIds,
    timezone: ctx.organization.timezone,
  });

  return (
    <ControlOverviewClient
      data={data}
      locale={locale}
      currency={ctx.organization.currency}
    />
  );
}
