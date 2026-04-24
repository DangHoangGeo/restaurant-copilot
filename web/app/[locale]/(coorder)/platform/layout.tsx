// Platform Admin Protected Layout
// Route group: [locale]/(coorder)/platform

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import PlatformNav from "@/components/platform/platform-nav";
import PlatformHeader from "@/components/platform/platform-header";

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Check platform admin authentication
  const isAdmin = await isPlatformAdmin();

  if (!isAdmin) {
    // Redirect to login or unauthorized page
    redirect(`/${locale}/login?error=platform_admin_required`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PlatformHeader locale={locale} />

      <div className="flex">
        {/* Left Navigation */}
        <PlatformNav locale={locale} />

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
