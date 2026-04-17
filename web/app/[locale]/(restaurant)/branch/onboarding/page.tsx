import React from "react";
import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { OnboardingClientContent } from "./onboarding-client-content";

export default async function OnboardingPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/onboarding`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <OnboardingClientContent locale={locale} />
      </div>
    </div>
  );
}
