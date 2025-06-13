// web/shared/types/customer.ts
import { MenuItem, Category, MenuItemSize, Topping } from './menu';

// Re-export menu types for backward compatibility
export type { MenuItem, Category, MenuItemSize, Topping };

export interface TableInfo {
  id: string;
  name: string;
  status?: "available" | "occupied" | "reserved";
  is_outdoor: boolean;
  is_accessible: boolean;
  notes?: string | null;
  qr_code?: string | null;
  capacity: number | null;
}

export interface RestaurantSettings {
  name: string;
  logoUrl: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}
