import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import StaffClient from "./staff-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.staff" });
  return { title: t("pageTitle") };
}

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const ctx = await resolveOrgContext();
  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("employees")) {
    redirect(`/${locale}/branch`);
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <StaffClient />
    </div>
  );
}
