import React from "react";
import { notFound, redirect } from 'next/navigation';
import { HomepageClientContent } from "./homepage-client-content";
import { resolveFounderControlContext } from '@/lib/server/control/access';

export default async function HomepagePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();

  if (!ctx) {
    notFound();
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
