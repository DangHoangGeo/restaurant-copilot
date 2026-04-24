import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import StaffClient from "./staff-client";
import { buildBranchPath } from "@/lib/branch-paths";

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
  params: Promise<{ locale: string; branchId?: string }>;
}) {
  const { locale, branchId } = await params;

  const ctx = await resolveOrgContext();
  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("employees")) {
    redirect(buildBranchPath(locale, branchId));
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <StaffClient />
    </div>
  );
}
