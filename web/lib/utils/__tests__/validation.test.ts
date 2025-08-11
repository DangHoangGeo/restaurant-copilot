import {
  paginationSchema,
  dateRangeSchema,
  orderStatusSchema,
  ordersGetQuerySchema,
  VALIDATION_LIMITS,
} from '../validation';

describe('Validation Schemas', () => {
  describe('paginationSchema', () => {
    it('should use default values when none are provided', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE);
      }
    });

    it('should accept valid page and pageSize', () => {
      const result = paginationSchema.safeParse({ page: 2, pageSize: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it('should fail for page size greater than max', () => {
      const result = paginationSchema.safeParse({ pageSize: VALIDATION_LIMITS.MAX_PAGE_SIZE + 1 });
      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('should accept a valid date range', () => {
      const result = dateRangeSchema.safeParse({ fromDate: '2025-01-01', toDate: '2025-01-15' });
      expect(result.success).toBe(true);
    });

    it('should fail if fromDate is after toDate', () => {
      const result = dateRangeSchema.safeParse({ fromDate: '2025-01-15', toDate: '2025-01-01' });
      expect(result.success).toBe(false);
    });

    it('should fail if range is more than MAX_DATE_RANGE_DAYS', () => {
      const fromDate = '2025-01-01';
      const toDate = `2025-02-10`; // More than 31 days
      const result = dateRangeSchema.safeParse({ fromDate, toDate });
      expect(result.success).toBe(false);
    });
  });

  describe('orderStatusSchema', () => {
    it('should accept a valid status', () => {
      const result = orderStatusSchema.safeParse('completed');
      expect(result.success).toBe(true);
    });

    it('should fail for an invalid status', () => {
      const result = orderStatusSchema.safeParse('shipped');
      expect(result.success).toBe(false);
    });

    it('should handle both "cancelled" and "canceled"', () => {
        let result = orderStatusSchema.safeParse('canceled');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('cancelled');
        }

        result = orderStatusSchema.safeParse('cancelled');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('cancelled');
        }
    });
  });

  describe('ordersGetQuerySchema', () => {
    it('should parse a valid query', () => {
      const query = {
        fromDate: '2025-08-01',
        toDate: '2025-08-15',
        status: 'new,completed',
        page: '2',
        pageSize: '20',
      };
      const result = ordersGetQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fromDate).toBe('2025-08-01');
        expect(result.data.status).toEqual(['new', 'completed']);
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should use defaults for missing values', () => {
        const query = {};
        const result = ordersGetQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if(result.success) {
            expect(result.data.page).toBe(1);
            expect(result.data.pageSize).toBe(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE);
            expect(result.data.status).toBeUndefined();
        }
    });
  });
});
