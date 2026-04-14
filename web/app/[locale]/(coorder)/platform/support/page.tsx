import { getTranslations } from 'next-intl/server';
import SupportTicketsTable from '@/components/platform/support-tickets-table';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'platform.support' });
  return { title: t('title') };
}

export default async function PlatformSupportPage() {
  const t = await getTranslations('platform.support');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <SupportTicketsTable />
      </div>
    </div>
  );
}
