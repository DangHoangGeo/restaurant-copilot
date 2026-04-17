import { mapInventoryRowsToLowStockItems } from '@/lib/server/dashboard/low-stock';

describe('mapInventoryRowsToLowStockItems', () => {
  it('filters rows below threshold and sorts by severity', () => {
    const result = mapInventoryRowsToLowStockItems([
      {
        id: 'low',
        stock_level: 4,
        threshold: 10,
        menu_items: {
          name_en: 'Miso Soup',
          price: 400,
          categories: { name_en: 'Sides' },
        },
      },
      {
        id: 'critical',
        stock_level: 1,
        threshold: 10,
        menu_items: {
          name_en: 'Salmon Don',
          price: 1200,
          categories: { name_en: 'Rice Bowls' },
        },
      },
      {
        id: 'healthy',
        stock_level: 12,
        threshold: 10,
        menu_items: {
          name_en: 'Tea',
          categories: { name_en: 'Drinks' },
        },
      },
    ]);

    expect(result).toEqual([
      {
        id: 'critical',
        name: 'Salmon Don',
        stock_level: 1,
        threshold: 10,
        category: 'Rice Bowls',
        severity: 'critical',
        price: 1200,
      },
      {
        id: 'low',
        name: 'Miso Soup',
        stock_level: 4,
        threshold: 10,
        category: 'Sides',
        severity: 'warning',
        price: 400,
      },
    ]);
  });
});
