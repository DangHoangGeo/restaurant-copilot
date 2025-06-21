'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Star,
  DollarSign,
  Package,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface ItemReportData {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
  avgRating: number;
  reviewCount: number;
  costPerItem: number;
  profitMargin: number;
  popularityRank: number;
  lastOrderDate: string;
  imageUrl?: string;
}

interface ItemsReportTabProps {
  data: ItemReportData[];
  isLoading: boolean;
  onExport: (format: 'csv' | 'pdf') => void;
  isExporting: boolean;
  currency?: string;
}

type SortField = 'name' | 'totalSold' | 'revenue' | 'avgRating' | 'profitMargin' | 'popularityRank';
type SortDirection = 'asc' | 'desc';

export function ItemsReportTab({
  data,
  isLoading,
  onExport,
  isExporting,
  currency = 'JPY'
}: ItemsReportTabProps) {
  const t = useTranslations('owner.reports.itemsReport');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.map(item => item.category)));
    return cats.sort();
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [data, searchTerm, categoryFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-500" />
      : <ArrowDown className="h-4 w-4 text-blue-500" />;
  };

  const calculateTotals = () => {
    return {
      totalRevenue: filteredAndSortedData.reduce((sum, item) => sum + item.revenue, 0),
      totalSold: filteredAndSortedData.reduce((sum, item) => sum + item.totalSold, 0),
      avgRating: filteredAndSortedData.length > 0 
        ? filteredAndSortedData.reduce((sum, item) => sum + item.avgRating, 0) / filteredAndSortedData.length 
        : 0,
      totalItems: filteredAndSortedData.length
    };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalRevenue')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totals.totalRevenue, currency)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalSold')}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totals.totalSold}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('avgRating')}</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {totals.avgRating.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalItems')}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totals.totalItems}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Report Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? t('exporting') : 'CSV'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? t('exporting') : 'PDF'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filterByCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories')}</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 p-0 h-auto font-medium"
                    >
                      {t('itemName')}
                      {getSortIcon('name')}
                    </Button>
                  </th>
                  <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                    {t('category')}
                  </th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalSold')}
                      className="flex items-center gap-2 p-0 h-auto font-medium ml-auto"
                    >
                      {t('totalSold')}
                      {getSortIcon('totalSold')}
                    </Button>
                  </th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('revenue')}
                      className="flex items-center gap-2 p-0 h-auto font-medium ml-auto"
                    >
                      {t('revenue')}
                      {getSortIcon('revenue')}
                    </Button>
                  </th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('avgRating')}
                      className="flex items-center gap-2 p-0 h-auto font-medium ml-auto"
                    >
                      {t('avgRating')}
                      {getSortIcon('avgRating')}
                    </Button>
                  </th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('profitMargin')}
                      className="flex items-center gap-2 p-0 h-auto font-medium ml-auto"
                    >
                      {t('profitMargin')}
                      {getSortIcon('profitMargin')}
                    </Button>
                  </th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('popularityRank')}
                      className="flex items-center gap-2 p-0 h-auto font-medium ml-auto"
                    >
                      {t('popularity')}
                      {getSortIcon('popularityRank')}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            #{item.popularityRank} {t('mostPopular')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">
                      {item.category}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {item.totalSold}
                    </td>
                    <td className="p-3 text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(item.revenue, currency)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{item.avgRating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">({item.reviewCount})</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-medium ${
                        item.profitMargin > 50 
                          ? 'text-green-600 dark:text-green-400' 
                          : item.profitMargin > 30 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-red-600 dark:text-red-400'
                      }`}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        #{item.popularityRank}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('noItemsFound')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
