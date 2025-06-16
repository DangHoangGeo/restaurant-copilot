import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
//import "../customer-theme.css";
import { Providers } from "../providers"; // Assuming Providers is in web/app/providers.tsx
import { Toaster } from "@/components/ui/toaster"; // Use our custom toaster
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const fontSans = GeistSans;
export const fontMono = GeistMono;

interface RootLayoutProps {
  children: React.ReactNode;
  params: { 
    locale: string;
    restaurant?: string; 
  };
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const messages = await getMessages();

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable,
          params.restaurant ? "customer-theme-active" : "" // Simple restaurant detection
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}