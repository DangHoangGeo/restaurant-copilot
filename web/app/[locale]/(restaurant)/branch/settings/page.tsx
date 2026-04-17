import { redirect } from "next/navigation";
import { resolveFounderControlContext } from "@/lib/server/control/access";

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const founderContext = await resolveFounderControlContext();

  if (founderContext) {
    redirect(`/${locale}/control/settings`);
  }

  redirect(`/${locale}/branch`);
}
