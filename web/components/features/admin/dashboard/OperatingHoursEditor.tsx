"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  surface?: "default" | "controlDark";
}

export function OperatingHoursEditor({
  value,
  onChange,
  disabled = false,
  surface = "default",
}: OperatingHoursProps) {
  const t = useTranslations("owner.settings");
  const tCommon = useTranslations("common");
  const isControlDark = surface === "controlDark";

  const updateDay = (
    day: OpeningHoursDayKey,
    updates: Partial<OpeningHoursDay>,
  ) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        ...updates,
      },
    });
  };

  const setAllDays = (template: OpeningHoursDay) => {
    const newHours = {} as OpeningHours;
    OPENING_HOURS_DAYS.forEach((day) => {
      newHours[day] = { ...template };
    });
    onChange(newHours);
  };

  const getQuickPresets = () => [
    {
      label: t("operatingHours.presets.standard"),
      hours: {
        isOpen: true,
        openTime: "09:00",
        closeTime: "21:00",
        isClosed: false,
      },
    },
    {
      label: t("operatingHours.presets.restaurant"),
      hours: {
        isOpen: true,
        openTime: "11:00",
        closeTime: "22:00",
        isClosed: false,
      },
    },
    {
      label: t("operatingHours.presets.cafe"),
      hours: {
        isOpen: true,
        openTime: "07:00",
        closeTime: "17:00",
        isClosed: false,
      },
    },
    {
      label: t("operatingHours.presets.closed"),
      hours: {
        isOpen: false,
        openTime: "09:00",
        closeTime: "17:00",
        isClosed: true,
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label
          className={cn(
            "text-base font-medium",
            isControlDark && "text-[#FFF7E9]",
          )}
        >
          {t("labels.operatingHours")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {getQuickPresets().map((preset, index) => (
            <Button
              key={index}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllDays(preset.hours)}
              disabled={disabled}
              className={cn(
                "flex-shrink-0 text-xs",
                isControlDark &&
                  "rounded-md border-[#E9C27B]/35 bg-[#E9C27B]/10 text-[#FFE3A6] hover:bg-[#E9C27B]/18 hover:text-[#FFF7E9]",
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {OPENING_HOURS_DAYS.map((day) => {
          const dayHours = value[day] || {
            isOpen: true,
            openTime: "09:00",
            closeTime: "21:00",
            isClosed: false,
          };

          return (
            <div
              key={day}
              className={cn(
                "space-y-2 rounded-lg border p-3",
                isControlDark && "border-[#F1DCC4]/12 bg-[#FFF7E9]/6",
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium capitalize",
                    isControlDark && "text-[#FFF7E9]",
                  )}
                >
                  {tCommon(`days.${day}`)}
                </div>
                <Switch
                  checked={dayHours.isOpen && !dayHours.isClosed}
                  onCheckedChange={(checked) =>
                    updateDay(day, {
                      isOpen: checked,
                      isClosed: !checked,
                    })
                  }
                  disabled={disabled}
                />
              </div>

              {dayHours.isOpen && !dayHours.isClosed ? (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    type="time"
                    value={dayHours.openTime}
                    onChange={(e) =>
                      updateDay(day, { openTime: e.target.value })
                    }
                    disabled={disabled}
                    className={cn(
                      "w-full flex-shrink-0 sm:w-28",
                      isControlDark &&
                        "border-[#F1DCC4]/18 bg-[#17110C]/70 text-[#FFF7E9] focus-visible:ring-[#D6A85F]/35",
                    )}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap text-sm text-muted-foreground",
                      isControlDark && "text-[#C9B7A0]",
                    )}
                  >
                    {t("operatingHours.to")}
                  </span>
                  <Input
                    type="time"
                    value={dayHours.closeTime}
                    onChange={(e) =>
                      updateDay(day, { closeTime: e.target.value })
                    }
                    disabled={disabled}
                    className={cn(
                      "w-full flex-shrink-0 sm:w-28",
                      isControlDark &&
                        "border-[#F1DCC4]/18 bg-[#17110C]/70 text-[#FFF7E9] focus-visible:ring-[#D6A85F]/35",
                    )}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "text-sm text-muted-foreground",
                    isControlDark && "text-[#C9B7A0]",
                  )}
                >
                  {t("operatingHours.closed")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "text-xs text-muted-foreground",
          isControlDark && "text-[#A98F75]",
        )}
      >
        {t("operatingHours.helpText")}
      </div>
    </div>
  );
}
