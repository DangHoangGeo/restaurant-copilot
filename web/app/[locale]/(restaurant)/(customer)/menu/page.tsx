import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server'
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
    code?: string;
  }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { locale } = await params;
  
  setRequestLocale(locale);

  return (
    <Suspense fallback={<SmartMenuSkeleton />}>
      <MenuPageClient locale={locale} />
    </Suspense>
  );
}
