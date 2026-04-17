import { getTranslations } from 'next-intl/server';
import { OwnerProfileClient } from '@/components/features/profile/OwnerProfileClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.profile' });
  return { title: t('title') };
}

export default function ControlProfilePage() {
  return <OwnerProfileClient />;
}
