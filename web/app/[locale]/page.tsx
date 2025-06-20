"use client";
import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
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
} from '@/components/home';
import { getSubdomainFromHost } from '@/lib/utils';
import { RestaurantHomepage } from '@/components/features/customer/screens/HomePage';

// Main Landing Page Component
export default function Page() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const locale = useLocale();
  
  useEffect(() => {
    const host = window.location.hostname;
    const detectedSubdomain = getSubdomainFromHost(host);
    setSubdomain(detectedSubdomain);
  }, []);

  // If subdomain is detected, show restaurant homepage instead of general landing
  if (subdomain) {
    return <RestaurantHomepage subdomain={subdomain} locale={locale} />;
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

