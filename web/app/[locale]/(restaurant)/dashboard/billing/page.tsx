import React from "react";
import { BillingClientContent } from "./billing-client-content";

export default async function BillingPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <BillingClientContent locale={locale} />
    </div>
  );
}
