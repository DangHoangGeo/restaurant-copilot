import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";

export default async function DashboardHomepagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/homepage`);
  }

  redirect(`/${locale}/branch`);
}
