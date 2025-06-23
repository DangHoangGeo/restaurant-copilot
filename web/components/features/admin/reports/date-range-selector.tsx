'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon, FileSpreadsheet, FileText } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeOption {
  value: string;
  label: string;
  getRange: () => DateRange;
}

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  isExporting: boolean;
  showExport?: boolean;
}

export function DateRangeSelector({
  selectedRange,
  onRangeChange,
  onExport,
  isExporting,
  showExport = true
}: DateRangeSelectorProps) {
  const t = useTranslations('owner.reports');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Predefined date range options
  const dateRangeOptions: DateRangeOption[] = [
    {
      value: 'today',
      label: t('dateRange.today'),
      getRange: () => ({
        from: new Date(),
        to: new Date()
      })
    },
    {
      value: 'yesterday',
      label: t('dateRange.yesterday'),
      getRange: () => {
        const yesterday = subDays(new Date(), 1);
        return {
          from: yesterday,
          to: yesterday
        };
      }
    },
    {
      value: 'last7days',
      label: t('dateRange.last7Days'),
      getRange: () => ({
        from: subDays(new Date(), 6),
        to: new Date()
      })
    },
    {
      value: 'last30days',
      label: t('dateRange.last30Days'),
      getRange: () => ({
        from: subDays(new Date(), 29),
        to: new Date()
      })
    },
    {
      value: 'thisWeek',
      label: t('dateRange.thisWeek'),
      getRange: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
      })
    },
    {
      value: 'thisMonth',
      label: t('dateRange.thisMonth'),
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    }
  ];

  const handlePresetChange = (value: string) => {
    const option = dateRangeOptions.find(opt => opt.value === value);
    if (option) {
      onRangeChange(option.getRange());
    }
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onRangeChange({
        from: range.from,
        to: range.to
      });
      setIsCalendarOpen(false);
    }
  };

  const formatDateRange = (range: DateRange) => {
    const isSameDay = format(range.from, 'yyyy-MM-dd') === format(range.to, 'yyyy-MM-dd');
    
    if (isSameDay) {
      return format(range.from, 'PPP');
    }
    
    return `${format(range.from, 'PPP')} - ${format(range.to, 'PPP')}`;
  };

  const getCurrentPresetValue = () => {
    const currentRange = selectedRange;
    for (const option of dateRangeOptions) {
      const optionRange = option.getRange();
      if (
        format(currentRange.from, 'yyyy-MM-dd') === format(optionRange.from, 'yyyy-MM-dd') &&
        format(currentRange.to, 'yyyy-MM-dd') === format(optionRange.to, 'yyyy-MM-dd')
      ) {
        return option.value;
      }
    }
    return 'custom';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('dateRangeSelector.title')}
          </span>
          {showExport && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isExporting ? t('exporting') : 'CSV'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {isExporting ? t('exporting') : 'PDF'}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Preset Date Ranges */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('dateRangeSelector.quickSelect')}
            </label>
            <Select value={getCurrentPresetValue()} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('dateRangeSelector.selectPeriod')} />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t('dateRangeSelector.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('dateRangeSelector.customRange')}
            </label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedRange ? (
                    formatDateRange(selectedRange)
                  ) : (
                    <span>{t('dateRangeSelector.pickDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedRange?.from}
                  selected={{
                    from: selectedRange.from,
                    to: selectedRange.to
                  }}
                  onSelect={handleCustomDateSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Selected Range Display */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{t('dateRangeSelector.selectedRange')}:</strong> {formatDateRange(selectedRange)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
