import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { buildBranchPath } from '@/lib/branch-paths';
import { MenuItem, Category } from '@/shared/types/menu';

// Re-export types for this page
export type { MenuItem, Category };

export default async function MenuPage({
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

  redirect(buildBranchPath(locale, user.restaurantId, 'menu'));
}
