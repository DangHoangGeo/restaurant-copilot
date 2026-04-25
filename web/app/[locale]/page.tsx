import React from "react";
import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import "../globals.css";
import {
  ThemeProviderLanding,
  LandingPageHeader,
  HeroSection,
  FeaturesSection,
  PricingSection,
  FooterSection,
} from "@/components/home";
import { getSubdomainFromHost } from "@/lib/utils";
import { NewHomePage } from "@/components/features/customer/homepage";
import { getPublicHomepageData } from "@/lib/server/customer-homepage";
import { getPublicPlatformStats } from "@/lib/server/public-platform-stats";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

async function fetchHomepageData(params: { host: string; subdomain: string }) {
  return getPublicHomepageData({
    host: params.host,
    subdomain: params.subdomain,
  });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  if (subdomain) {
    const initialHomepageData = await fetchHomepageData({ host, subdomain });
    return <NewHomePage locale={locale} initialData={initialHomepageData} />;
  }

  const platformStats = await getPublicPlatformStats();

  return (
    <ThemeProviderLanding>
      <div className="min-h-screen bg-[#080705] font-sans text-[#f7efe2] antialiased">
        <LandingPageHeader locale={locale} />
        <HeroSection stats={platformStats} />
        <FeaturesSection />
        <PricingSection />
        <FooterSection />
      </div>
    </ThemeProviderLanding>
  );
}
