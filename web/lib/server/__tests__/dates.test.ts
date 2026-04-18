import {
  getTimezoneOffset,
  getLocalDateString,
  getLocalDayRange,
  getLocalDateRange,
  bucketToLocalDate,
} from '@/lib/server/dashboard/dates';

describe('dashboard date helpers', () => {
  describe('getTimezoneOffset', () => {
    it('returns +09:00 for Asia/Tokyo', () => {
      expect(getTimezoneOffset('Asia/Tokyo')).toBe('+09:00');
    });

    it('returns +07:00 for Asia/Ho_Chi_Minh', () => {
      expect(getTimezoneOffset('Asia/Ho_Chi_Minh')).toBe('+07:00');
    });

    it('falls back to Asia/Tokyo offset for unknown timezones', () => {
      expect(getTimezoneOffset('Mars/Olympus_Mons')).toBe('+09:00');
    });

    it('falls back to Asia/Tokyo offset when timezone is null or undefined', () => {
      expect(getTimezoneOffset(null)).toBe('+09:00');
      expect(getTimezoneOffset(undefined)).toBe('+09:00');
    });
  });

  describe('getLocalDateString', () => {
    it('returns the JST wall-clock date, not the UTC date', () => {
      // 2026-04-16 16:00 UTC = 2026-04-17 01:00 JST
      const late = new Date('2026-04-16T16:00:00Z');
      expect(getLocalDateString('Asia/Tokyo', late)).toBe('2026-04-17');
    });

    it('returns the UTC date when no shift is needed', () => {
      const noon = new Date('2026-04-17T12:00:00Z');
      expect(getLocalDateString('UTC', noon)).toBe('2026-04-17');
    });
  });

  describe('getLocalDayRange', () => {
    it('builds +09:00-anchored bounds for JST', () => {
      const range = getLocalDayRange('2026-04-17', 'Asia/Tokyo');
      expect(range.start).toBe('2026-04-17T00:00:00+09:00');
      expect(range.end).toBe('2026-04-17T23:59:59.999+09:00');
    });

    it('builds +07:00-anchored bounds for Vietnam', () => {
      const range = getLocalDayRange('2026-04-17', 'Asia/Ho_Chi_Minh');
      expect(range.start).toBe('2026-04-17T00:00:00+07:00');
      expect(range.end).toBe('2026-04-17T23:59:59.999+07:00');
    });
  });

  describe('getLocalDateRange', () => {
    it('returns a contiguous 7-day inclusive range ending at today', () => {
      const range = getLocalDateRange('2026-04-17', 7);
      expect(range).toEqual([
        '2026-04-11',
        '2026-04-12',
        '2026-04-13',
        '2026-04-14',
        '2026-04-15',
        '2026-04-16',
        '2026-04-17',
      ]);
    });

    it('handles month boundaries', () => {
      const range = getLocalDateRange('2026-05-02', 4);
      expect(range).toEqual(['2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02']);
    });
  });

  describe('bucketToLocalDate', () => {
    it('buckets a late-evening UTC order into the next JST day', () => {
      // 2026-04-16T23:30 UTC = 2026-04-17T08:30 JST
      expect(bucketToLocalDate('2026-04-16T23:30:00Z', 'Asia/Tokyo')).toBe('2026-04-17');
    });

    it('buckets an early-morning UTC order into the previous JST day', () => {
      // 2026-04-17T02:00 UTC = 2026-04-17T11:00 JST
      expect(bucketToLocalDate('2026-04-17T02:00:00Z', 'Asia/Tokyo')).toBe('2026-04-17');
    });
  });
});
