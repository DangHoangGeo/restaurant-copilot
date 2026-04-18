import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/restaurants`);
  }

  redirect(`/${locale}/branch`);
}
