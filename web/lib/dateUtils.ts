/**
 * Date Utility Functions
 */

/**
 * Returns the Monday of the week for the given date.
 * ISO 8601 week starts on Monday.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Adds/subtracts days from a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns an array of 7 Date objects starting from the given Monday.
 */
export function getDaysOfWeek(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(monday, i));
  }
  return days;
}

/**
 * Formats date to 'YYYY-MM-DD'.
 */
export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates ISO 8601 week number for a given Date object.
 * Source: https://stackoverflow.com/a/6117889/1133530 (adapted)
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Gets the correct ISO year for the week.
 * This is important for weeks that span across two Gregorian years.
 * e.g. Jan 1st 2026 is in week 1 of 2026, but Dec 30th 2024 is in week 1 of 2025.
 */
export function getYearForISOWeek(date: Date): number {
  const d = new Date(date.valueOf());
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); // Adjust to Thursday of the same week
  return d.getFullYear();
}


/**
 * Formats date to 'YYYY-Www' (e.g., '2023-W05').
 */
export function formatDateYYYYWww(date: Date): string {
  const weekNo = getISOWeekNumber(date);
  const year = getYearForISOWeek(date); // Use ISO year
  return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Formats date for display, e.g., "Mon dd/MM".
 * @param date The date to format.
 * @param locale Optional locale string (e.g., 'en-US', 'ja-JP'). Defaults to system locale.
 */
export function formatDateForDisplay(date: Date, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit' };
  return date.toLocaleDateString(locale, options);
}

/**
 * Formats date for week range display, e.g., "Oct 28 - Nov 03, 2024".
 * @param startDate The start date of the range (usually a Monday).
 * @param endDate The end date of the range (usually a Sunday).
 * @param locale Optional locale string.
 */
export function formatWeekRangeForDisplay(startDate: Date, endDate: Date, locale?: string): string {
    const startOptions: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };
    const endOptions: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };

    const startStr = startDate.toLocaleDateString(locale, startOptions);
    const endStr = endDate.toLocaleDateString(locale, endOptions);

    // If the week spans across two years, include year for start date as well.
    if (startDate.getFullYear() !== endDate.getFullYear()) {
        const startOptionsWithYear: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
        const startStrWithYear = startDate.toLocaleDateString(locale, startOptionsWithYear);
        return `${startStrWithYear} - ${endStr}`;
    }

    return `${startStr} - ${endStr}`;
}

/**
 * Formats date to 'YYYY-MM' for API query.
 */
export function formatDateYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats an ISO dateTime string to 'HH:MM:SS' or 'HH:MM'.
 * Returns 'N/A' if the date string is null or invalid.
 * @param dateTimeString ISO date-time string.
 * @param showSeconds Whether to include seconds in the output.
 */
export function formatTime(dateTimeString?: string | null, showSeconds: boolean = false): string {
  if (!dateTimeString) {
    return "N/A";
  }
  try {
    const date = new Date(dateTimeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    if (showSeconds) {
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "N/A";
  }
}

/**
 * Formats a date object to display month and year, e.g., "October 2024".
 * @param date The date to format.
 * @param locale Optional locale string.
 */
export function formatMonthYearForDisplay(date: Date, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return date.toLocaleDateString(locale, options);
}
