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
  position_x: number | null;
  position_y: number | null;
  capacity: number | null;
}

export interface RestaurantSettings {
  name: string;
  logoUrl: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}
