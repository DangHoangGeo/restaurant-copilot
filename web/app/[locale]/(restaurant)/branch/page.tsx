import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { buildBranchPath } from '@/lib/branch-paths';

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getUserFromRequest();

  if (!user?.restaurantId) {
    redirect(`/${locale}/login`);
  }

  redirect(buildBranchPath(locale, user.restaurantId));
}
