// Purchasing domain types
// Mirrors the tables added in migration 041_purchasing_phase5.

export type SupplierCategory =
  | 'food'
  | 'beverage'
  | 'equipment'
  | 'utilities'
  | 'general';

export type PurchaseOrderStatus = 'pending' | 'received' | 'cancelled';

export type PurchaseCategory =
  | 'food'
  | 'beverage'
  | 'equipment'
  | 'utilities'
  | 'other';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'utilities'
  | 'maintenance'
  | 'other';

// ─── Supplier ────────────────────────────────────────────

export interface Supplier {
  id: string;
  restaurant_id: string;
  name: string;
  category: SupplierCategory;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Purchase Order ───────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  restaurant_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  restaurant_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  category: PurchaseCategory;
  status: PurchaseOrderStatus;
  order_date: string;
  received_date: string | null;
  total_amount: number;
  currency: string;
  tax_amount: number | null;
  notes: string | null;
  receipt_url: string | null;
  is_paid: boolean;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

// ─── Expense ──────────────────────────────────────────────

export interface Expense {
  id: string;
  restaurant_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Aggregates ───────────────────────────────────────────

export interface PurchaseSummary {
  /** Total amount of all purchase orders in the range */
  total_orders_amount: number;
  /** Number of purchase orders */
  order_count: number;
  /** Total amount of all quick expenses in the range */
  total_expenses_amount: number;
  /** Number of expense records */
  expense_count: number;
  /** Combined purchasing spend */
  combined_total: number;
  currency: string;
}
