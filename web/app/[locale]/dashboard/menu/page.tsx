
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MenuClientContent } from './menu-client-content';
import { headers } from 'next/headers';
import { getSubdomainFromHost } from '@/lib/utils';
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface MenuItem {
	id: string;
	name_en: string;
	name_ja: string;
	name_vi: string;
	description_en: string;
	description_ja: string;
	description_vi: string;
	price: number;
	image_url?: string;
	available: boolean;
	weekday_visibility: number[];
	stock_level?: number;
	position: number;
	averageRating?: number;
	reviewCount?: number;
}

export interface Category {
	id: string;
	name_en: string;
	name_ja: string;
	name_vi: string;
	position: number;
	menu_items: MenuItem[];
}

export default async function MenuPage({
	params
}: {
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: 'AdminMenu' });

	const host = (await headers()).get("host") || "";
	const subdomain = getSubdomainFromHost(host);

	let restaurantId: string | null = null;
	let errorGettingId: string | null = null;
	const user = await getUserFromRequest();
	if (user && user.subdomain !== subdomain) {
		errorGettingId = t("Settings.Page.errors.noSubdomainDetected");
	}
	restaurantId = user?.restaurantId || null;

	let initialData: Category[] | null = null;
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
			initialData = null; // No categories found
		}
		if (!categories || categories.length === 0) {
			return <MenuClientContent initialData={null} error={t('errors.no_categories_found')} />;
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
						<AlertTitle>{t("Settings.Page.errors.noRestaurantIdTitle")}</AlertTitle>
						<AlertDescription>{errorGettingId}</AlertDescription>
					</Alert>
				)}

				{!errorGettingId && !restaurantId && !fetchError && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{t("Settings.Page.errors.noRestaurantIdTitle")}</AlertTitle>
						<AlertDescription>{t("errors.noRestaurantIdMessage")}</AlertDescription>
					</Alert>
				)}

				{restaurantId && fetchError && (
					<Alert variant="destructive" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{t("Settings.Page.errors.fetchErrorTitle")}</AlertTitle>
						<AlertDescription>{fetchError}</AlertDescription>
					</Alert>
				)}

				{restaurantId && initialData && !fetchError && (
					<MenuClientContent
						initialData={initialData}
						error={null}
					/>
				)}

				{restaurantId && !initialData && !fetchError && (
					<Alert variant="warning" className="mb-6">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{t("Settings.Page.errors.noSettingsFoundTitle")}</AlertTitle>
						<AlertDescription>{t("errors.no_categories_found")}</AlertDescription>
					</Alert>
				)}
			</div>
		);
	}
}
