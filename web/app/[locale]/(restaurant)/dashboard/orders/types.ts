// Types for the orders module
export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string | null;
  status: "ordered" | "preparing" | "ready" | "served";
  created_at: string;
  menu_items: {
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
    }[];
  }[];
}

export interface Order {
  id: string;
  table_id: string;
  status: "new" | "preparing" | "ready" | "completed" | "canceled";
  total_amount: number | null;
  created_at: string;
  order_items: OrderItem[];
  tables: { name: string; id?: string }[];
}

export interface Table {
  id: string;
  name: string;
  status?: "available" | "occupied" | "reserved";
}
