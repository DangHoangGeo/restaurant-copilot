import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next";
import { Lora, Klee_One } from "next/font/google";

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const kleeOne = Klee_One({
  subsets: ["latin"],
  weight: ["400", "600"],
});

const fontMap = {
  en: lora,
  vi: lora,
  ja: kleeOne,
};

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
  description:
    "Coorder AI is your co-pilot for restaurant management, providing AI-driven support to streamline operations and enhance efficiency.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale || routing.defaultLocale || "en";

  // Validate that the incoming locale is supported
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const font = fontMap[locale as keyof typeof fontMap] || lora;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        style={{ fontFamily: font.style.fontFamily }}
        className="antialiased bg-background"
      >
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
