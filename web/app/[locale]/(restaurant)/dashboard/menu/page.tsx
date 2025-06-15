
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MenuClientContent } from './menu-client-content';
import { headers } from 'next/headers';
import { getSubdomainFromHost } from '@/lib/utils';
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
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
	const t = await getTranslations({ locale, namespace: 'AdminMenu' });
	const tCommon = await getTranslations({ locale, namespace: 'Common' });
	const host = (await headers()).get("host") || "";
	const subdomain = getSubdomainFromHost(host);

	let restaurantId: string | null = null;
	let errorGettingId: string | null = null;
	const user = await getUserFromRequest();
	if (user && user.subdomain !== subdomain) {
		errorGettingId = tCommon("errors.noSubdomainDetected");
	}
	restaurantId = user?.restaurantId || null;

	let initialData: Category[] = [];
	let fetchError: string | null = null;

	if (user && user.restaurantId) {
		// Construct the full URL for the API call
		const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
		const apiUrl = `${baseUrl}/api/v1/categories?restaurantId=${user.restaurantId}`;

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			cache: 'no-store', // Ensure fresh data on each request
		});

		if (!response.ok) {
			const errorData = await response.json();
			fetchError = errorData.message || 'Failed to fetch categories';
			throw new Error(errorData.message || 'Failed to fetch categories');
		}

		const { categories } = await response.json();
		if (categories && categories.length > 0) {
			initialData = categories.map((category: Category) => ({
				...category,
				menu_items: category.menu_items || [],
			}));
		} else {
			initialData = []; // Empty array for no categories, not null
		}

		return (
			<div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
				<header className="mb-8">
					<h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
						{t("title")}
					</h1>
				</header>

				{errorGettingId && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{tCommon("errors.noRestaurantIdTitle")}</AlertTitle>
						<AlertDescription>{errorGettingId}</AlertDescription>
					</Alert>
				)}

				{!errorGettingId && !restaurantId && !fetchError && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{tCommon("errors.noRestaurantIdTitle")}</AlertTitle>
						<AlertDescription>{tCommon("errors.noRestaurantIdMessage")}</AlertDescription>
					</Alert>
				)}

				{restaurantId && fetchError && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{tCommon("errors.fetchErrorTitle")}</AlertTitle>
						<AlertDescription>{fetchError}</AlertDescription>
					</Alert>
				)}

				{restaurantId && !fetchError && (
					<MenuClientContent
						initialData={initialData}
						error={null}
					/>
				)}
			</div>
		);
	}
}
