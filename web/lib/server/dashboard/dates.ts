/**
 * Date helpers for dashboard routes.
 *
 * Owner dashboards need to bucket orders by the restaurant's local day, not UTC.
 * A Japan-based restaurant that closes at 23:30 JST would otherwise see the last
 * 9 hours of sales appear on the next day because Postgres stores `created_at`
 * in UTC and naive `toISOString().split('T')[0]` rolls over at UTC midnight.
 *
 * We follow the same pattern the `daily-usage-snapshot` edge function uses:
 * compute the wall-clock date in the restaurant's timezone, then express the
 * day boundaries with the correct offset so Postgres converts them back to UTC
 * accurately. This avoids introducing a new timezone library (`date-fns-tz`,
 * `luxon`, etc.) and stays consistent with migration 044.
 *
 * Phase 0 scope: default to Asia/Tokyo. Later phases can pass per-branch
 * timezones from the restaurants table.
 */

export const DEFAULT_RESTAURANT_TIMEZONE = 'Asia/Tokyo';

/** Offsets for the timezones we ship with today. Extend when new markets open. */
const KNOWN_TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Tokyo': '+09:00',
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Seoul': '+09:00',
  UTC: '+00:00',
};

/**
 * Resolve the ISO-8601 offset (e.g. "+09:00") for a timezone name.
 * Falls back to the Asia/Tokyo offset if the timezone is unknown, so Japan-first
 * behaviour is preserved even when a branch has not set its timezone yet.
 */
export function getTimezoneOffset(timezone: string | null | undefined): string {
  const tz = timezone ?? DEFAULT_RESTAURANT_TIMEZONE;
  return KNOWN_TIMEZONE_OFFSETS[tz] ?? KNOWN_TIMEZONE_OFFSETS[DEFAULT_RESTAURANT_TIMEZONE];
}

/**
 * Return the YYYY-MM-DD wall-clock date for `now` in the given timezone.
 * The result is the restaurant's local "today" — safe to use as a day-bucket key.
 */
export function getLocalDateString(
  timezone: string | null | undefined = DEFAULT_RESTAURANT_TIMEZONE,
  now: Date = new Date()
): string {
  const offsetMinutes = parseOffsetMinutes(getTimezoneOffset(timezone));
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
  // toISOString() serialises in UTC; because we added the offset, the UTC
  // display equals the local wall-clock representation of `now`.
  return shifted.toISOString().split('T')[0];
}

/**
 * Given a local YYYY-MM-DD date and timezone, return inclusive UTC-expressed
 * bounds covering that local day. Used in Postgrest filters like
 * `.gte('created_at', start).lte('created_at', end)`.
 */
export function getLocalDayRange(
  localDate: string,
  timezone: string | null | undefined = DEFAULT_RESTAURANT_TIMEZONE
): { start: string; end: string } {
  const offset = getTimezoneOffset(timezone);
  return {
    start: `${localDate}T00:00:00${offset}`,
    end: `${localDate}T23:59:59.999${offset}`,
  };
}

/**
 * Return a contiguous list of YYYY-MM-DD local dates ending at `localToday`
 * and spanning `days` total (inclusive). Useful for 7-day trend charts.
 */
export function getLocalDateRange(
  localToday: string,
  days: number
): string[] {
  // Parse YYYY-MM-DD as a UTC date; stepping by 24h is safe because we never
  // cross daylight-saving boundaries for JP/VN (the two launch markets).
  const result: string[] = [];
  const endUtc = new Date(`${localToday}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endUtc.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

/**
 * Convert a UTC timestamp (ISO string) to the local YYYY-MM-DD bucket for the
 * given timezone. Useful when grouping query results by local day client-side.
 */
export function bucketToLocalDate(
  utcIso: string,
  timezone: string | null | undefined = DEFAULT_RESTAURANT_TIMEZONE
): string {
  return getLocalDateString(timezone, new Date(utcIso));
}

function parseOffsetMinutes(offset: string): number {
  // Accepts "+09:00", "-07:30", "Z", "+0900".
  if (offset === 'Z' || offset === '+00:00' || offset === '-00:00') return 0;
  const match = offset.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}
