"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { enUS, ja, vi } from "date-fns/locale";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

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
  onExport: (format: "csv" | "pdf") => void;
  isExporting: boolean;
  showExport?: boolean;
}

export function DateRangeSelector({
  selectedRange,
  onRangeChange,
  onExport,
  isExporting,
  showExport = true,
}: DateRangeSelectorProps) {
  const t = useTranslations("owner.reports");
  const params = useParams();
  const locale = ((params.locale as string) || "en").startsWith("vi")
    ? vi
    : ((params.locale as string) || "en").startsWith("ja")
      ? ja
      : enUS;
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Predefined date range options
  const dateRangeOptions: DateRangeOption[] = [
    {
      value: "today",
      label: t("dateRange.today"),
      getRange: () => ({
        from: new Date(),
        to: new Date(),
      }),
    },
    {
      value: "yesterday",
      label: t("dateRange.yesterday"),
      getRange: () => {
        const yesterday = subDays(new Date(), 1);
        return {
          from: yesterday,
          to: yesterday,
        };
      },
    },
    {
      value: "last7days",
      label: t("dateRange.last7Days"),
      getRange: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      value: "last30days",
      label: t("dateRange.last30Days"),
      getRange: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
    {
      value: "thisWeek",
      label: t("dateRange.thisWeek"),
      getRange: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      value: "thisMonth",
      label: t("dateRange.thisMonth"),
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
  ];

  const handlePresetChange = (value: string) => {
    const option = dateRangeOptions.find((opt) => opt.value === value);
    if (option) {
      onRangeChange(option.getRange());
    }
  };

  const handleCustomDateSelect = (
    range: { from?: Date; to?: Date } | undefined,
  ) => {
    if (range?.from && range?.to) {
      onRangeChange({
        from: range.from,
        to: range.to,
      });
      setIsCalendarOpen(false);
    }
  };

  const formatDateRange = (range: DateRange) => {
    const isSameDay =
      format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd");

    if (isSameDay) {
      return format(range.from, "PPP", { locale });
    }

    return `${format(range.from, "PPP", { locale })} - ${format(range.to, "PPP", { locale })}`;
  };

  const getCurrentPresetValue = () => {
    const currentRange = selectedRange;
    for (const option of dateRangeOptions) {
      const optionRange = option.getRange();
      if (
        format(currentRange.from, "yyyy-MM-dd") ===
          format(optionRange.from, "yyyy-MM-dd") &&
        format(currentRange.to, "yyyy-MM-dd") ===
          format(optionRange.to, "yyyy-MM-dd")
      ) {
        return option.value;
      }
    }
    return "custom";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t("dateRangeSelector.title")}
          </span>
          {showExport && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("csv")}
                disabled={isExporting}
                className="flex flex-1 items-center gap-2 sm:flex-none"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isExporting ? t("exporting") : "CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("pdf")}
                disabled={isExporting}
                className="flex flex-1 items-center gap-2 sm:flex-none"
              >
                <FileText className="h-4 w-4" />
                {isExporting ? t("exporting") : "PDF"}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Preset Date Ranges */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-[#6F4D35] dark:text-[#F1DCC4]">
              {t("dateRangeSelector.quickSelect")}
            </label>
            <Select
              value={getCurrentPresetValue()}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("dateRangeSelector.selectPeriod")}
                />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  {t("dateRangeSelector.custom")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-[#6F4D35] dark:text-[#F1DCC4]">
              {t("dateRangeSelector.customRange")}
            </label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "h-auto min-h-10 w-full justify-start !whitespace-normal text-left font-normal leading-5",
                    !selectedRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedRange ? (
                    formatDateRange(selectedRange)
                  ) : (
                    <span>{t("dateRangeSelector.pickDate")}</span>
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
                    to: selectedRange.to,
                  }}
                  onSelect={handleCustomDateSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Selected Range Display */}
        <div className="mt-4 rounded-lg border border-[#AB6E3C]/12 bg-[#F5EAD8]/70 p-3 dark:border-[#F1DCC4]/12 dark:bg-[#2B1A10]/70">
          <p className="text-sm text-[#6F4D35] dark:text-[#F1DCC4]">
            <strong>{t("dateRangeSelector.selectedRange")}:</strong>{" "}
            {formatDateRange(selectedRange)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
