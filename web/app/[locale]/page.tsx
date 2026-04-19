import React from "react";
import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import "../globals.css";
import {
  ThemeProviderLanding,
  LandingPageHeader,
  HeroSection,
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

  return (
    <ThemeProviderLanding>
      <div
        className="min-h-screen font-sans antialiased"
        style={{
          background: "linear-gradient(160deg, #FAF3EA 0%, #F5EAD8 50%, #EFE0CA 100%)",
        }}
      >
        <LandingPageHeader locale={locale} />
        <HeroSection />
      </div>
    </ThemeProviderLanding>
  );
}
