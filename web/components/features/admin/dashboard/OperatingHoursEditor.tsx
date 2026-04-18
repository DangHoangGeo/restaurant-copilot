"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  OPENING_HOURS_DAYS,
  type OpeningHours,
  type OpeningHoursDay,
  type OpeningHoursDayKey,
} from "@/lib/utils/opening-hours";

interface OperatingHoursProps {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
  disabled?: boolean;
}

export function OperatingHoursEditor({ value, onChange, disabled = false }: OperatingHoursProps) {
  const t = useTranslations("owner.settings");
  const tCommon = useTranslations("common");

  const updateDay = (day: OpeningHoursDayKey, updates: Partial<OpeningHoursDay>) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        ...updates
      }
    });
  };

  const setAllDays = (template: OpeningHoursDay) => {
    const newHours = {} as OpeningHours;
    OPENING_HOURS_DAYS.forEach(day => {
      newHours[day] = { ...template };
    });
    onChange(newHours);
  };

  const getQuickPresets = () => [
    {
      label: t("operatingHours.presets.standard"),
      hours: { isOpen: true, openTime: '09:00', closeTime: '21:00', isClosed: false }
    },
    {
      label: t("operatingHours.presets.restaurant"),
      hours: { isOpen: true, openTime: '11:00', closeTime: '22:00', isClosed: false }
    },
    {
      label: t("operatingHours.presets.cafe"),
      hours: { isOpen: true, openTime: '07:00', closeTime: '17:00', isClosed: false }
    },
    {
      label: t("operatingHours.presets.closed"),
      hours: { isOpen: false, openTime: '09:00', closeTime: '17:00', isClosed: true }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("labels.operatingHours")}</Label>
        <div className="flex flex-wrap gap-2">
          {getQuickPresets().map((preset, index) => (
            <Button
              key={index}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllDays(preset.hours)}
              disabled={disabled}
              className="text-xs flex-shrink-0"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {OPENING_HOURS_DAYS.map(day => {
          const dayHours = value[day] || { isOpen: true, openTime: '09:00', closeTime: '21:00', isClosed: false };
          
          return (
            <div key={day} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium capitalize min-w-0 flex-1">
                  {tCommon(`days.${day}`)}
                </div>
                <Switch
                  checked={dayHours.isOpen && !dayHours.isClosed}
                  onCheckedChange={(checked) => updateDay(day, { 
                    isOpen: checked, 
                    isClosed: !checked 
                  })}
                  disabled={disabled}
                />
              </div>

              {dayHours.isOpen && !dayHours.isClosed ? (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    type="time"
                    value={dayHours.openTime}
                    onChange={(e) => updateDay(day, { openTime: e.target.value })}
                    disabled={disabled}
                    className="w-full sm:w-28 flex-shrink-0"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">to</span>
                  <Input
                    type="time"
                    value={dayHours.closeTime}
                    onChange={(e) => updateDay(day, { closeTime: e.target.value })}
                    disabled={disabled}
                    className="w-full sm:w-28 flex-shrink-0"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("operatingHours.closed")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {t("operatingHours.helpText")}
      </div>
    </div>
  );
}
