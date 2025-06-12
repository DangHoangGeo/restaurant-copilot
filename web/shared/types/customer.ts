// web/shared/types/customer.ts
export interface MenuItem {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[]; // 1 (Mon) to 7 (Sun)
  averageRating?: number;
  reviewCount?: number;
}

export interface Category {
  id: string;
  position: number;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: MenuItem[];
}

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

export interface MenuItemSize {
  id: string;
  size_key: string; // e.g., "small", "medium", "large"
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number; // Price for this size
  position: number; // For ordering
}

export interface Topping {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number; // Additional price for this topping
  position: number; // For ordering
  // restaurant_id and menu_item_id are implicit or handled by backend association
}

export interface RestaurantSettings {
  name: string;
  logoUrl: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}
