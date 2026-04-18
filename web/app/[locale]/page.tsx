import React from "react";
import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import "../globals.css";
import {
  ThemeProviderLanding,
  LandingPageHeader,
  HeroSection,
  SocialProofSection,
  FeaturesSection,
  HowItWorksSection,
  BenefitsSection,
  PricingSection,
  FaqSection,
  CallToActionSection,
  FooterSection,
} from "@/components/home";
import { getSubdomainFromHost } from "@/lib/utils";
import { NewHomePage } from "@/components/features/customer/homepage";
import { getPublicHomepageData } from "@/lib/server/customer-homepage";

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

// Main Landing Page Component
export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Server-side subdomain detection
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  // If subdomain is detected, fetch homepage data server-side
  let initialHomepageData = null;
  if (subdomain) {
    initialHomepageData = await fetchHomepageData({ host, subdomain });
  }

  // If subdomain is detected, show restaurant homepage instead of general landing
  if (subdomain) {
    return <NewHomePage locale={locale} initialData={initialHomepageData} />;
  }

  // Original generic landing page content
  return (
    <ThemeProviderLanding>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen font-sans antialiased">
        <LandingPageHeader locale={locale} />
        <main>
          <HeroSection />
          <SocialProofSection />
          <FeaturesSection />
          <HowItWorksSection />
          <BenefitsSection />
          <PricingSection />
          <FaqSection />
          <CallToActionSection />
        </main>
        <FooterSection locale={locale} />
      </div>
    </ThemeProviderLanding>
  );
}
