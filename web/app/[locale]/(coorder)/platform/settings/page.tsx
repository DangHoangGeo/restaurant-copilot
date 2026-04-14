import { getTranslations } from 'next-intl/server';
import PlatformSettings from '@/components/platform/platform-settings';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'platform.nav' });
  return { title: t('settings') };
}

export default async function PlatformSettingsPage() {
  const t = await getTranslations('platform.nav');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('settings')}</h2>
      </div>

      <PlatformSettings />
    </div>
  );
}
