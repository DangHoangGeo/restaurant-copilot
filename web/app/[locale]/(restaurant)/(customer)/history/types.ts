// Types for customer order history

export interface MenuItemSize {
  id: string;
  size_key: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number;
}

export interface Topping {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  price: number;
}

export interface OrderItem {
	id: string;
	quantity: number;
	notes?: string;
	status: 'new' | 'preparing' | 'ready' | 'served';
	created_at: string;
	name_en: string;
	name_ja: string;
	name_vi: string;
	unit_price: number;
	total: number;
	menu_item_id: string;
	price_at_order?: number;
	toppings?: Array<Topping>;
	menu_item_sizes?: MenuItemSize | null;
}

export interface Order {
	id: string;
	session_id: string;
	guest_count: number;
	status: string;
	table_id: string | null;
	table_name: string | null;
	total_amount: number;
	created_at: string;
	items: OrderItem[];
}

export interface OrderHistoryResponse {
  success: boolean;
  order: Order;
}

export type OrderStatus = 'new' | 'serving' | 'ready' | 'completed' | 'canceled';
export type OrderItemStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';
