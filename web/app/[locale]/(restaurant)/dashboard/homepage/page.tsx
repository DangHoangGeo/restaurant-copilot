import React from "react";
import { HomepageClientContent } from "./homepage-client-content";

export default async function HomepagePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <HomepageClientContent locale={locale} />
    </div>
  );
}
