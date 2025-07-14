"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Filter, Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface OrdersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  orderStatus: string;
  onOrderStatusChange: (value: string) => void;
  itemStatus: string;
  onItemStatusChange: (value: string) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  viewType: "items" | "orders" | "grid";
}

export function OrdersFilters({
  searchTerm,
  onSearchChange,
  orderStatus,
  onOrderStatusChange,
  itemStatus,
  onItemStatusChange,
  onDateRangeChange,
  viewType
}: OrdersFiltersProps) {
  const t = useTranslations("owner.orders");
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Quick date options for mobile
  const setQuickDate = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - days);
    onDateRangeChange({ from, to: today });
  };

  // Status options based on view type
  const statusOptions = viewType === "items" 
    ? [
        { value: "all", label: t('allStatuses') },
        { value: "new", label: t('new') },
        { value: "preparing", label: t('preparing') },
        { value: "ready", label: t('ready') },
        { value: "served", label: t('served') }
      ]
    : [
        { value: "all", label: t('allStatuses') },
        { value: "new", label: t('new') },
        { value: "serving", label: t('serving') },
        { value: "completed", label: t('completed') },
        { value: "canceled", label: t('canceled') }
      ];

  const activeStatus = viewType === "items" ? itemStatus : orderStatus;
  const onStatusChange = viewType === "items" ? onItemStatusChange : onOrderStatusChange;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Search Bar - Always visible */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('searchOrdersOrId')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-3">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                {t('filters')}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4">
            {/* Status Filter - Quick Pills */}
            <div>
              <p className="text-sm font-medium mb-2">{t('status')}</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={activeStatus === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStatusChange(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Filter - Quick Options */}
            <div>
              <p className="text-sm font-medium mb-2">{t('dateRange')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(0)}
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {t('today')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(1)}
                  className="text-xs"
                >
                  {t('yesterday')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(7)}
                  className="text-xs"
                >
                  {t('lastWeek')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(30)}
                  className="text-xs"
                >
                  {t('lastMonth')}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
