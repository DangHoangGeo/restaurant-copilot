import { HistoryPageClient } from '@/app/[locale]/(restaurant)/(customer)/history/HistoryPageClient';

interface HistoryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { locale } = await params;
  
  return <HistoryPageClient locale={locale} />;
}
