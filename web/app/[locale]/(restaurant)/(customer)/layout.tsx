import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { CustomerLayout } from '@/components/features/customer/layout/CustomerLayout';
import { Providers } from '@/app/providers';
import { ErrorBoundary } from '@/components/features/customer/common/ErrorBoundary';

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
  const { locale } = await params;
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