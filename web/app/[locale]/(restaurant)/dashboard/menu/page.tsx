
import { setRequestLocale } from 'next-intl/server';
import { MenuClientContent } from './menu-client-content';
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

	return (
		<div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
			<MenuClientContent />
		</div>
	);
}
