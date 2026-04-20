import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { buildBranchPath } from "@/lib/branch-paths";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string; branchId?: string }>;
}) {
  const { locale, branchId } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/people`);
  }

  redirect(buildBranchPath(locale, branchId));
}
