import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "coorder ai | your AI assistant for restaurant management",
  keywords: [
    "restaurant management",
    "AI support",
    "restaurant assistant",
    "restaurant co-pilot",
    "restaurant management software",
    "restaurant management AI",
    "co-pilot",
    "restaurant operations",
    "restaurant software",
    "restaurant AI",
    "order management",
    "menu management",
    "staff management",
    "customer management",
    "restaurant analytics",
    "restaurant efficiency",
    "restaurant technology",
    "restaurant automation",
    "restaurant solutions",
    "restaurant tools",
    "restaurant innovation",
    "restaurant success",
    "restaurant growth",
    "restaurant industry",
  ],
  authors: [
    {
      name: "Coorder AI",
      url: "https://coorder.ai",
    },
  ],
  description: "Coorder AI is your co-pilot for restaurant management, providing AI-driven support to streamline operations and enhance efficiency.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  }
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale || routing.defaultLocale || 'en';

  // Validate that the incoming locale is supported
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
