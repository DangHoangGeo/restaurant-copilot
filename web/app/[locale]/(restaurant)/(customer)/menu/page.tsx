import { Suspense } from 'react';
import { MenuPageClient } from './MenuPageClient';
import { SmartMenuSkeleton } from '@/components/ui/enhanced-skeleton';

interface MenuPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    tableId?: string;
    sessionId?: string;
    tableNumber?: string;
  }>;
}

export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const { locale } = await params;
  const { tableId, sessionId, tableNumber } = await searchParams;

  return (
    <Suspense fallback={<SmartMenuSkeleton />}>
      <MenuPageClient
        locale={locale}
        tableId={tableId}
        sessionId={sessionId}
        tableNumber={tableNumber}
      />
    </Suspense>
  );
}
