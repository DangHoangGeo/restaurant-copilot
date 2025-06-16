import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { CustomerLayout } from '@/components/features/customer/layout/CustomerLayout';
import { Providers } from '@/app/providers';
import { ErrorBoundary } from '@/components/features/customer/common/ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations(locale);
  
  return {
    title: t('Customer.meta.title'),
    description: t('Customer.meta.description'),
  };
}

export default async function CustomerLayoutWrapper({ children, params: { locale } }: LayoutProps) {
  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <ErrorBoundary>
          <CustomerLayout>
            {children}
          </CustomerLayout>
        </ErrorBoundary>
      </Providers>
    </NextIntlClientProvider>
  );
}