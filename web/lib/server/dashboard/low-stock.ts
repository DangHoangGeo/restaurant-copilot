export interface InventoryMenuCategoryRow {
  name_en?: string | null;
  name_ja?: string | null;
  name_vi?: string | null;
}

export interface InventoryMenuItemRow {
  id?: string;
  name_en?: string | null;
  name_ja?: string | null;
  name_vi?: string | null;
  price?: number | null;
  available?: boolean | null;
  categories?: InventoryMenuCategoryRow | InventoryMenuCategoryRow[] | null;
}

export interface InventoryLowStockRow {
  id: string;
  stock_level: number | null;
  threshold: number | null;
  menu_items?: InventoryMenuItemRow | InventoryMenuItemRow[] | null;
}

export interface DashboardLowStockItem {
  id: string;
  name: string;
  stock_level: number;
  threshold: number;
  category: string;
  severity: 'critical' | 'warning' | 'low';
  price?: number;
}

function pickLocalizedName(value: {
  name_en?: string | null;
  name_ja?: string | null;
  name_vi?: string | null;
} | null | undefined, fallback: string) {
  return value?.name_en || value?.name_ja || value?.name_vi || fallback;
}

function toSingleMenuItem(menuItems: InventoryMenuItemRow | InventoryMenuItemRow[] | null | undefined) {
  return Array.isArray(menuItems) ? menuItems[0] ?? null : menuItems ?? null;
}

type InventoryLowStockRowWithNumbers = InventoryLowStockRow & {
  stock_level: number;
  threshold: number;
};

function hasNumericStockAndThreshold(
  item: InventoryLowStockRow
): item is InventoryLowStockRowWithNumbers {
  return item.stock_level !== null && item.threshold !== null;
}

export function mapInventoryRowsToLowStockItems(rows: InventoryLowStockRow[]): DashboardLowStockItem[] {
  const processedItems = rows
    .filter(hasNumericStockAndThreshold)
    .filter((item) => item.stock_level < item.threshold)
    .map((item) => {
      const menuItem = toSingleMenuItem(item.menu_items);
      const categories = Array.isArray(menuItem?.categories)
        ? menuItem.categories
        : menuItem?.categories
          ? [menuItem.categories]
          : [];
      const threshold = item.threshold;
      const stockLevel = item.stock_level;
      const stockRatio = threshold > 0 ? stockLevel / threshold : 0;

      let severity: 'critical' | 'warning' | 'low';
      if (stockRatio <= 0.2) {
        severity = 'critical';
      } else if (stockRatio <= 0.5) {
        severity = 'warning';
      } else {
        severity = 'low';
      }

      return {
        id: item.id,
        name: pickLocalizedName(menuItem, 'Unknown'),
        stock_level: stockLevel,
        threshold,
        category: pickLocalizedName(categories[0], 'Unknown'),
        severity,
        price: menuItem?.price ?? undefined,
      };
    });

  processedItems.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    const ratioA = a.threshold > 0 ? a.stock_level / a.threshold : 0;
    const ratioB = b.threshold > 0 ? b.stock_level / b.threshold : 0;
    return ratioA - ratioB;
  });

  return processedItems;
}
