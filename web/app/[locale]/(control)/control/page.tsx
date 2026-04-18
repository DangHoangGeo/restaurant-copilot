import { redirect } from 'next/navigation';
import { resolveFounderControlContext } from '@/lib/server/control/access';

export default async function ControlIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const controlContext = await resolveFounderControlContext();

  if (controlContext?.organization.onboarding_completed_at) {
    redirect(`/${locale}/control/overview`);
  }

  redirect(`/${locale}/control/onboarding`);
}
