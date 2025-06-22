// Types for the orders module

// RPC function response structure
export interface OrdersRPCRow {
  order_id: string;
  order_restaurant_id: string;
  order_table_id: string | null;
  order_session_id: string;
  order_guest_count: number;
  order_status: string;
  order_total_amount: number;
  order_created_at: string;
  order_updated_at: string;
  table_id: string | null;
  table_name: string | null;
  table_status: string | null;
  table_capacity: number | null;
  table_is_outdoor: boolean | null;
  table_is_accessible: boolean | null;
  table_notes: string | null;
  order_items: OrderItemFromRPC[];
}

export interface OrderItemFromRPC {
  id: string;
  restaurant_id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  price_at_order: number | null;
  topping_ids: string[] | null;
  menu_item_size_id: string | null;
  created_at: string;
  menu_item: {
    id: string;
    restaurant_id: string;
    category_id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    code: string;
    description_en: string | null;
    description_ja: string | null;
    price: number;
    updated_at: string;
  };
}

export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string | null;
  status: "ordered" | "preparing" | "ready" | "served";
  created_at: string;
  menu_item_size_id?: string | null;
  topping_ids?: string[] | null;
  price_at_order?: number;
  // From RPC function structure
  menu_item?: {
    id: string;
    restaurant_id: string;
    category_id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    code: string;
    description_en: string | null;
    description_ja: string | null;
    price: number;
    updated_at: string;
  };
  // Legacy structure for backward compatibility
  menu_items?: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    category_id: string;
    price: number;
    categories?: {
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    };
  };
  menu_item_sizes?: {
    id: string;
    size_key: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  };
  toppings?: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }[];
}

export interface Order {
  id: string;
  table_id: string | null;
  session_id?: string;
  guest_count?: number;
  status: "new" | "preparing" | "ready" | "completed" | "canceled";
  total_amount: number | null;
  created_at: string;
  updated_at?: string;
  order_items: OrderItem[];
  // From new API structure - table returned as single object from Supabase foreign key
  tables: { 
    id: string; 
    name: string;
    capacity?: number;
  };
}

export interface Table {
  id: string;
  name: string;
  status?: "available" | "occupied" | "reserved";
}
