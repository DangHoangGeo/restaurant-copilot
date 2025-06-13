// Shared menu-related type definitions
// This file centralizes all MenuItem, Category, and related interfaces

export interface MenuItemSize {
  id?: string;
  size_key: string; // e.g., "small", "medium", "large"
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  price: number; // Price for this size
  position: number; // For ordering
}

export interface Topping {
  id?: string;
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  price: number; // Additional price for this topping
  position: number; // For ordering
}

export interface MenuItem {
  id: string;
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  weekday_visibility: number[]; // 1 (Mon) to 7 (Sun)
  stock_level?: number;
  position: number;
  averageRating?: number;
  reviewCount?: number;
  category_id?: string;
  tags?: string[];
  code?: string;
  restaurant_id?: string;
  created_at?: string;
  updated_at?: string;
  menu_item_sizes?: MenuItemSize[];
  toppings?: Topping[];
}

export interface Category {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  position: number;
  restaurant_id?: string;
  created_at?: string;
  updated_at?: string;
  menu_items: MenuItem[];
}

// For admin forms where category might not have menu_items yet
export interface MenuItemCategory {
  id: string;
  name: string; // Used for display in forms
  name_en?: string;
  name_ja?: string;
  name_vi?: string;
  position?: number;
  restaurant_id?: string;
}

// Legacy alias for backward compatibility
export type MenuCategory = Category;
