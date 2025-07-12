import { Providers } from "../providers";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string; restaurant?: string };
}

export default async function LocaleLayout({ children }: LocaleLayoutProps) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        {children}
        <Toaster />
      </Providers>
    </NextIntlClientProvider>
  );
}