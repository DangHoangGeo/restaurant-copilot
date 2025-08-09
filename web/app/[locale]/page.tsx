import { headers } from "next/headers";
import { getSubdomainFromHost } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
import { NewHomePage } from "@/components/features/customer/homepage";
import { setRequestLocale } from "next-intl/server";

async function getHomepageData(subdomain: string) {
  const { data, error } = await supabaseAdmin
    .rpc("get_restaurant_homepage_data", {
      restaurant_subdomain: subdomain,
    })
    .single();

  if (error) {
    console.error("Error fetching homepage data:", error);
    return null;
  }
  return data;
}

export default async function Page({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = getSubdomainFromHost(host || "");

  if (subdomain) {
    const homepageData = await getHomepageData(subdomain);

    if (homepageData) {
      return (
        <NewHomePage
          subdomain={subdomain}
          locale={params.locale}
          homepageData={homepageData}
        />
      );
    }
  }

  return (
    <ThemeProviderLanding>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen font-sans antialiased">
        <LandingPageHeader locale={params.locale} />
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
        <FooterSection locale={params.locale} />
      </div>
    </ThemeProviderLanding>
  );
}
