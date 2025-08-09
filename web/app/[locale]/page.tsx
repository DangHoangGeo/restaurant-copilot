import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
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
import { NewHomePage } from '@/components/features/customer/homepage';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

async function fetchHomepageData(subdomain: string) {
  try {
    const { data: homepageData, error: homepageError } = await supabaseAdmin
      .rpc('get_restaurant_homepage_data', { restaurant_subdomain: subdomain });

    if (homepageError) {
      console.error("Error fetching homepage data:", homepageError);
      return null;
    }

    if (!homepageData || homepageData.error) {
      return null;
    }

    // Transform data to match our interface
    return {
      restaurant: {
        ...homepageData.restaurant,
        logoUrl: homepageData.restaurant.logo_url,
      },
      owners: homepageData.owners || [],
      gallery: homepageData.gallery || [],
      signature_dishes: homepageData.signature_dishes || [],
    };
  } catch (err) {
    console.error('Failed to fetch homepage data:', err);
    return null;
  }
}

// Main Landing Page Component
export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Server-side subdomain detection
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomainFromHost(host);

  // If subdomain is detected, fetch homepage data server-side
  let initialHomepageData = null;
  if (subdomain) {
    initialHomepageData = await fetchHomepageData(subdomain);
  }

  // If subdomain is detected, show restaurant homepage instead of general landing
  if (subdomain) {
    return <NewHomePage subdomain={subdomain} locale={locale} initialData={initialHomepageData} />;
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

