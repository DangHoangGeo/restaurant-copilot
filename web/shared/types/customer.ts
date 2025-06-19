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
  qr_code_created_at?: string | null;
  capacity: number | null;
}
export interface SessionData {
  sessionStatus: "new" | "existing" | "resolved" | "invalid" | "expired" | "active";
  canAddItems: boolean;
  tableId?: string | null;
  sessionId?: string | null;
  tableNumber?: string | null;
  code?: string | null;
}
export interface RestaurantSettings {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string | null;
  defaultLocale?: string;
  contactInfo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  opening_hours?: Record<string, string>;
  social_links?: Record<string, string>;
  timezone?: string;
  currency?: string;
  payment_methods?: string[];
  delivery_options?: string[];
  primaryColor?: string;
  secondaryColor?: string;
}
