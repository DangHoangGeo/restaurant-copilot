export const OPENING_HOURS_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type OpeningHoursDayKey = (typeof OPENING_HOURS_DAYS)[number];

export interface OpeningHoursDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export type OpeningHours = Record<OpeningHoursDayKey, OpeningHoursDay>;

const DEFAULT_DAY_HOURS: OpeningHoursDay = {
  isOpen: true,
  openTime: "09:00",
  closeTime: "21:00",
  isClosed: false,
};

const SHORT_DAY_LABELS: Record<OpeningHoursDayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function createDefaultOpeningHours(): OpeningHours {
  return OPENING_HOURS_DAYS.reduce((hours, day) => {
    hours[day] = { ...DEFAULT_DAY_HOURS };
    return hours;
  }, {} as OpeningHours);
}

function parseOpeningHoursInput(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function normalizeOpeningHours(value: unknown): OpeningHours {
  const defaults = createDefaultOpeningHours();
  const parsed = parseOpeningHoursInput(value);

  if (!parsed || typeof parsed !== "object") {
    return defaults;
  }

  const record = parsed as Partial<Record<OpeningHoursDayKey, Partial<OpeningHoursDay>>>;

  return OPENING_HOURS_DAYS.reduce((hours, day) => {
    const source = record[day];
    const isClosed =
      typeof source?.isClosed === "boolean"
        ? source.isClosed
        : typeof source?.isOpen === "boolean"
          ? !source.isOpen
          : defaults[day].isClosed;
    const isOpen =
      typeof source?.isOpen === "boolean"
        ? source.isOpen
        : !isClosed;

    hours[day] = {
      isOpen,
      openTime: source?.openTime ?? defaults[day].openTime,
      closeTime: source?.closeTime ?? defaults[day].closeTime,
      isClosed,
    };

    return hours;
  }, {} as OpeningHours);
}

export function summarizeOpeningHours(hours: OpeningHours): string {
  return OPENING_HOURS_DAYS.map((day) => {
    const value = hours[day];
    const label = SHORT_DAY_LABELS[day];

    if (!value || value.isClosed || !value.isOpen) {
      return `${label} closed`;
    }

    return `${label} ${value.openTime}-${value.closeTime}`;
  }).join(", ");
}
