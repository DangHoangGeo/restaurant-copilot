import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { CustomerLayout } from '@/components/features/customer/layout/CustomerLayout';
import { Providers } from '@/app/providers';
import { ErrorBoundary } from '@/components/features/customer/common/ErrorBoundary';
import { getSubdomainFromHost } from '@/lib/utils';
import { getCustomerRestaurantFromSubdomain } from '@/lib/server/restaurant-settings';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("customer.home");
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}

export default async function CustomerLayoutWrapper({ children, params }: LayoutProps) {
  const [{ locale }, messages, headersList] = await Promise.all([
    params,
    getMessages(),
    headers(),
  ]);

  // Fetch restaurant settings on the server so CustomerDataContext starts with
  // real data and never shows a skeleton or fires a client-side fetch.
  const host = headersList.get('host') || '';
  const subdomain = getSubdomainFromHost(host);
  const initialSettings = subdomain
    ? await getCustomerRestaurantFromSubdomain(subdomain)
    : null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <ErrorBoundary>
          <CustomerLayout locale={locale} initialSettings={initialSettings}>
            {children}
          </CustomerLayout>
        </ErrorBoundary>
      </Providers>
    </NextIntlClientProvider>
  );
}
