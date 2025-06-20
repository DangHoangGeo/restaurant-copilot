'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Search,
	Filter,
	X,
	Table,
	List,
	RefreshCw,
	ChevronDown
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Category } from '@/shared/types/menu';
import { getLocalizedText } from '@/lib/utils';

export type ViewMode = 'list' | 'table';

export interface FilterState {
	searchTerm: string;
	categoryId: string | null;
	availability: 'all' | 'available' | 'unavailable';
	stockStatus: 'all' | 'low_stock' | 'in_stock';
}

interface MenuSearchFilterProps {
	categories: Category[];
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	onRefresh?: () => void;
	isLoading?: boolean;
	locale: string;
}

export function MenuSearchFilter({
	categories,
	filters,
	onFiltersChange,
	viewMode,
	onViewModeChange,
	onRefresh,
	isLoading = false,
	locale
}: MenuSearchFilterProps) {
	const t = useTranslations('owner.menu.filters');
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const updateFilter = useCallback((key: keyof FilterState, value: string | number | boolean | null) => {
		onFiltersChange({ ...filters, [key]: value });
	}, [filters, onFiltersChange]);

	const clearFilters = useCallback(() => {
		onFiltersChange({
			searchTerm: '',
			categoryId: null,
			availability: 'all',
			stockStatus: 'all'
		});
	}, [onFiltersChange]);

	const hasActiveFilters = filters.searchTerm ||
		filters.categoryId ||
		filters.availability !== 'all' ||
		filters.stockStatus !== 'all';

	const activeFiltersCount = [
		filters.searchTerm,
		filters.categoryId,
		filters.availability !== 'all' ? filters.availability : null,
		filters.stockStatus !== 'all' ? filters.stockStatus : null
	].filter(Boolean).length;

	return (
		<div className="space-y-4">
			{/* Mobile-first: Search and primary controls */}
			<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
				{/* Search Bar */}
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
					<Input
						placeholder="Search menu items..."
						value={filters.searchTerm}
						onChange={(e) => updateFilter('searchTerm', e.target.value)}
						className="pl-10 pr-8"
					/>
					{filters.searchTerm && (
						<Button
							variant="ghost"
							size="sm"
							className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
							onClick={() => updateFilter('searchTerm', '')}
						>
							<X className="h-3 w-3" />
						</Button>
					)}
				</div>

				{/* Quick Category Filter */}
				<div className="flex gap-2">
					<Select value={filters.categoryId || 'all'} onValueChange={(value) =>
						updateFilter('categoryId', value === 'all' ? null : value)
					}>
						<SelectTrigger className="w-40 sm:w-48">
							<SelectValue placeholder={t('all_categories')} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t('all_categories')}</SelectItem>
							{categories.map((category) => (
								<SelectItem key={category.id} value={category.id}>
									{getLocalizedText({
										name_en: category.name_en,
										name_ja: category.name_ja,
										name_vi: category.name_vi
									}, locale)} ({category.menu_items.length})
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Advanced Filters Collapsible - Fixed positioning */}
					<div className="relative">
						<Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
							<CollapsibleTrigger asChild>
								<Button
									variant="outline"
									size="default"
									className="relative"
								>
									<Filter className="h-4 w-4 mr-2" />
									{t('advanced_filters')}
									{activeFiltersCount > 0 && (
										<Badge
											variant="secondary"
											className="ml-2 px-1.5 py-0.5 text-xs min-w-[1.25rem] h-5"
										>
											{activeFiltersCount}
										</Badge>
									)}
									<ChevronDown className="h-4 w-4 ml-2" />
								</Button>

							</CollapsibleTrigger>
							<CollapsibleContent className="absolute top-full right-0 z-50 mt-2 w-80 rounded-md border bg-white dark:bg-gray-800 p-4 shadow-lg">
								<div className="space-y-4">
									<div className="flex items-center justify-between mb-2">

										<h4 className="font-medium">{t('advanced_filters')}</h4>
										{hasActiveFilters && (
											<Button variant="ghost" size="sm" onClick={clearFilters}>
												<X className="h-3 w-3" />
												{t('clear_filters')}
											</Button>
										)}
										<Button
											variant="ghost"
											size="sm"
											className=" h-6 w-6 p-0"
											onClick={() => setIsFilterOpen(false)}
										>
											<X className="h-3 w-3" />
										</Button>

									</div>

									{/* Availability Filter */}
									<div>
										<label className="text-sm font-medium mb-2 block">{t('availability')}</label>
										<Select value={filters.availability} onValueChange={(value: FilterState['availability']) =>
											updateFilter('availability', value)
										}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">{t('all')}</SelectItem>
												<SelectItem value="available">{t('available')}</SelectItem>
												<SelectItem value="unavailable">{t('unavailable')}</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Stock Status Filter */}
									<div>
										<label className="text-sm font-medium mb-2 block">{t('stock_status')}</label>
										<Select value={filters.stockStatus} onValueChange={(value: FilterState['stockStatus']) =>
											updateFilter('stockStatus', value)
										}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">{t('all_stock_levels')}</SelectItem>
												<SelectItem value="low_stock">{t('low_stock')} ({"<"}10)</SelectItem>
												<SelectItem value="in_stock">{t('in_stock')} (≥10)</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>
				</div>
			</div>

			{/* View Controls and Refresh */}
			<div className="flex items-center justify-between">
				{/* Active Filters Display */}
				<div className="flex flex-wrap gap-2">
					{filters.searchTerm && (
						<Badge variant="secondary" className="text-xs">
							{t("search")} {filters.searchTerm}
							<Button
								variant="ghost"
								size="sm"
								className="ml-1 h-3 w-3 p-0"
								onClick={() => updateFilter('searchTerm', '')}
							>
								<X className="h-2 w-2" />
							</Button>
						</Badge>
					)}

					{filters.categoryId && (
						<Badge variant="secondary" className="text-xs">
							{t("category")}: {getLocalizedText({
										name_en: categories.find(c => c.id === filters.categoryId)?.name_en,
										name_ja: categories.find(c => c.id === filters.categoryId)?.name_ja,
										name_vi: categories.find(c => c.id === filters.categoryId)?.name_vi
									}, locale)}
							<Button
								variant="ghost"
								size="sm"
								className="ml-1 h-3 w-3 p-0"
								onClick={() => updateFilter('categoryId', null)}
							>
								<X className="h-2 w-2" />
							</Button>
						</Badge>
					)}

					{filters.availability !== 'all' && (
						<Badge variant="secondary" className="text-xs">
							{filters.availability === 'available' ? 'Available' : 'Unavailable'}
							<Button
								variant="ghost"
								size="sm"
								className="ml-1 h-3 w-3 p-0"
								onClick={() => updateFilter('availability', 'all')}
							>
								<X className="h-2 w-2" />
							</Button>
						</Badge>
					)}

					{filters.stockStatus !== 'all' && (
						<Badge variant="secondary" className="text-xs">
							{filters.stockStatus === 'low_stock' ? 'Low Stock' : 'In Stock'}
							<Button
								variant="ghost"
								size="sm"
								className="ml-1 h-3 w-3 p-0"
								onClick={() => updateFilter('stockStatus', 'all')}
							>
								<X className="h-2 w-2" />
							</Button>
						</Badge>
					)}
				</div>

				{/* View Mode and Refresh */}
				<div className="flex items-center gap-2">
					{onRefresh && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onRefresh}
							disabled={isLoading}
							className="px-2"
						>
							<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
						</Button>
					)}

					<div className="flex border rounded-lg p-1">
						<Button
							variant={viewMode === 'list' ? 'default' : 'ghost'}
							size="sm"
							onClick={() => onViewModeChange('list')}
							className="px-2"
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === 'table' ? 'default' : 'ghost'}
							size="sm"
							onClick={() => onViewModeChange('table')}
							className="px-2"
						>
							<Table className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
