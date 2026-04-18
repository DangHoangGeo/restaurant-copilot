


export type Table = {
  id: string;
  name: string;
  capacity: number;
  restaurant_id?: string;
  status: 'available' | 'occupied' | 'reserved';
  is_outdoor: boolean;
  is_accessible: boolean;
  notes?: string | null;
  qr_code?: string | null;
  qr_code_created_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export interface PreOrderItem {
  itemId: string
  quantity: number
}

export interface Booking {
  id: string
  customerName: string
  contact: string
  date: string
  time: string
  partySize: number
  status: string
  preOrderItems: PreOrderItem[]
}

export type Restaurant = {
  id: string;
  name: string | null;
  subdomain: string | null;
  branch_code?: string | null;
  company_public_subdomain?: string | null;
  default_language: "en" | "ja" | "vi" | null;
  brand_color: string | null;
  tax: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: OpeningHours | string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  social_links: string | null; // JSON string
  currency: string | null;
  payment_methods: string[] | null;
  delivery_options: string[] | null;
  logo_url: string | null;
  onboarded: boolean | null;
  // Hero content fields for homepage
  hero_title_en: string | null;
  hero_title_ja: string | null;
  hero_title_vi: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_ja: string | null;
  hero_subtitle_vi: string | null;
  // Owner story content
  owner_story_en: string | null;
  owner_story_ja: string | null;
  owner_story_vi: string | null;
  owner_photo_url: string | null;
  // ensure all fields expected by SettingsForm are here
  created_at?: string | null; // Add if needed
  updated_at?: string | null; // Add if needed
  user_id?: string | null; // Add if needed
};
import type { OpeningHours } from "@/lib/utils/opening-hours";
