import React from "react";
import { SettingsClientContent } from "./settings-client-content";

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <SettingsClientContent locale={locale} />
    </div>
  );
}
