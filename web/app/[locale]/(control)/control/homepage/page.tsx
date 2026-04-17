import React from "react";
import { redirect } from 'next/navigation';
import { HomepageClientContent } from "./homepage-client-content";
import { resolveOrgContext } from '@/lib/server/organizations/service';

export default async function HomepagePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const ctx = await resolveOrgContext();

  if (!ctx) {
    redirect(`/${locale}/dashboard`);
  }

  if (!ctx.organization.onboarding_completed_at) {
    redirect(`/${locale}/control/onboarding`);
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <HomepageClientContent locale={locale} />
    </div>
  );
}
