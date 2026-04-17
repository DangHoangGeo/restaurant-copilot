import { DashboardClientContent } from './dashboard-client-content';
import { setRequestLocale } from 'next-intl/server';

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <DashboardClientContent />
    </div>
  );
}
