"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeSelector, type DateRange } from "@/components/features/admin/reports/date-range-selector";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface OrdersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  orderStatus: string;
  onOrderStatusChange: (value: string) => void;
  itemStatus: string;
  onItemStatusChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  viewType: "items" | "orders" | "grid";
}

export function OrdersFilters({
  searchTerm,
  onSearchChange,
  orderStatus,
  onOrderStatusChange,
  itemStatus,
  onItemStatusChange,
  dateRange,
  onDateRangeChange,
  viewType
}: OrdersFiltersProps) {
  const t = useTranslations("owner.orders");

  return (
    <>
      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeSelector
          selectedRange={dateRange}
          onRangeChange={onDateRangeChange}
          onExport={() => {}} // Placeholder for export functionality
          isExporting={false}
          showExport={false}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder={t('searchOrdersOrId')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Select value={orderStatus} onValueChange={onOrderStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterByOrderStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="new">{t('new')}</SelectItem>
            <SelectItem value="preparing">{t('preparing')}</SelectItem>
            <SelectItem value="ready">{t('ready')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
            <SelectItem value="canceled">{t('canceled')}</SelectItem>
          </SelectContent>
        </Select>

        {viewType === "items" && (
          <Select value={itemStatus} onValueChange={onItemStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('filterByItemStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="ordered">{t('ordered')}</SelectItem>
              <SelectItem value="preparing">{t('preparing')}</SelectItem>
              <SelectItem value="ready">{t('ready')}</SelectItem>
              <SelectItem value="served">{t('served')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </>
  );
}
