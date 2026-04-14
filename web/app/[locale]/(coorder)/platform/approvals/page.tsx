import { getTranslations } from 'next-intl/server';
import ApprovalsTable from '@/components/platform/approvals-table';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'platform.approvals' });
  return { title: t('title') };
}

export default async function PlatformApprovalsPage() {
  const t = await getTranslations('platform.approvals');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ApprovalsTable />
      </div>
    </div>
  );
}
