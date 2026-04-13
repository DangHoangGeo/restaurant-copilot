// Purchasing domain: raw database queries.
// Route handlers call service functions; avoid calling these directly from routes.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderWithItems,
  Expense,
  PurchaseSummary,
} from './types';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  ListPurchaseOrdersInput,
  ListExpensesInput,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers
// ─────────────────────────────────────────────────────────────────────────────

export async function listSuppliers(
  restaurantId: string,
  includeInactive = false
): Promise<Supplier[]> {
  let query = supabaseAdmin
    .from('suppliers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name', { ascending: true });

  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`listSuppliers: ${error.message}`);
  return (data ?? []) as Supplier[];
}

export async function getSupplierById(
  id: string,
  restaurantId: string
): Promise<Supplier | null> {
  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getSupplierById: ${error.message}`);
  return data as Supplier | null;
}

export async function createSupplier(
  restaurantId: string,
  input: CreateSupplierInput,
  createdBy: string | null
): Promise<Supplier> {
  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .insert({ ...input, restaurant_id: restaurantId, created_by: createdBy })
    .select('*')
    .single();

  if (error) throw new Error(`createSupplier: ${error.message}`);
  return data as Supplier;
}

export async function updateSupplier(
  id: string,
  restaurantId: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select('*')
    .single();

  if (error) throw new Error(`updateSupplier: ${error.message}`);
  return data as Supplier;
}

export async function deleteSupplier(
  id: string,
  restaurantId: string
): Promise<void> {
  // Soft-delete
  const { error } = await supabaseAdmin
    .from('suppliers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(`deleteSupplier: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Orders
// ─────────────────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(
  restaurantId: string,
  filters: ListPurchaseOrdersInput
): Promise<PurchaseOrder[]> {
  let query = supabaseAdmin
    .from('purchase_orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_date', { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.status)      query = query.eq('status', filters.status);
  if (filters.category)    query = query.eq('category', filters.category);
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
  if (filters.from_date)   query = query.gte('order_date', filters.from_date);
  if (filters.to_date)     query = query.lte('order_date', filters.to_date);
  if (filters.is_paid !== undefined) {
    query = query.eq('is_paid', filters.is_paid === 'true');
  }

  const { data, error } = await query;
  if (error) throw new Error(`listPurchaseOrders: ${error.message}`);
  return (data ?? []) as PurchaseOrder[];
}

export async function getPurchaseOrderById(
  id: string,
  restaurantId: string
): Promise<PurchaseOrderWithItems | null> {
  const { data, error } = await supabaseAdmin
    .from('purchase_orders')
    .select('*, purchase_order_items(*)')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getPurchaseOrderById: ${error.message}`);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as PurchaseOrder),
    items: (row.purchase_order_items ?? []) as PurchaseOrderItem[],
  };
}

export async function createPurchaseOrder(
  restaurantId: string,
  input: CreatePurchaseOrderInput,
  createdBy: string | null
): Promise<PurchaseOrderWithItems> {
  const { items, ...orderFields } = input;

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('purchase_orders')
    .insert({
      ...orderFields,
      restaurant_id: restaurantId,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (orderError) throw new Error(`createPurchaseOrder: ${orderError.message}`);
  const order = orderData as PurchaseOrder;

  let savedItems: PurchaseOrderItem[] = [];
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      ...item,
      purchase_order_id: order.id,
      restaurant_id: restaurantId,
    }));

    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('purchase_order_items')
      .insert(itemRows)
      .select('*');

    if (itemError) throw new Error(`createPurchaseOrder items: ${itemError.message}`);
    savedItems = (itemData ?? []) as PurchaseOrderItem[];
  }

  return { ...order, items: savedItems };
}

export async function updatePurchaseOrder(
  id: string,
  restaurantId: string,
  input: UpdatePurchaseOrderInput
): Promise<PurchaseOrder> {
  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (input.is_paid === true) {
    updatePayload.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('purchase_orders')
    .update(updatePayload)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select('*')
    .single();

  if (error) throw new Error(`updatePurchaseOrder: ${error.message}`);
  return data as PurchaseOrder;
}

export async function deletePurchaseOrder(
  id: string,
  restaurantId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('purchase_orders')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(`deletePurchaseOrder: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────────────────

export async function listExpenses(
  restaurantId: string,
  filters: ListExpensesInput
): Promise<Expense[]> {
  let query = supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('expense_date', { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.category)  query = query.eq('category', filters.category);
  if (filters.from_date) query = query.gte('expense_date', filters.from_date);
  if (filters.to_date)   query = query.lte('expense_date', filters.to_date);

  const { data, error } = await query;
  if (error) throw new Error(`listExpenses: ${error.message}`);
  return (data ?? []) as Expense[];
}

export async function getExpenseById(
  id: string,
  restaurantId: string
): Promise<Expense | null> {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw new Error(`getExpenseById: ${error.message}`);
  return data as Expense | null;
}

export async function createExpense(
  restaurantId: string,
  input: CreateExpenseInput,
  createdBy: string | null
): Promise<Expense> {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({ ...input, restaurant_id: restaurantId, created_by: createdBy })
    .select('*')
    .single();

  if (error) throw new Error(`createExpense: ${error.message}`);
  return data as Expense;
}

export async function updateExpense(
  id: string,
  restaurantId: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select('*')
    .single();

  if (error) throw new Error(`updateExpense: ${error.message}`);
  return data as Expense;
}

export async function deleteExpense(
  id: string,
  restaurantId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(`deleteExpense: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary / Aggregates
// ─────────────────────────────────────────────────────────────────────────────

/** Monthly spending summary for finance reporting. */
export async function getPurchaseSummary(
  restaurantId: string,
  fromDate: string,
  toDate: string,
  currency = 'JPY'
): Promise<PurchaseSummary> {
  const [ordersResult, expensesResult] = await Promise.all([
    supabaseAdmin
      .from('purchase_orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled')
      .gte('order_date', fromDate)
      .lte('order_date', toDate),
    supabaseAdmin
      .from('expenses')
      .select('amount')
      .eq('restaurant_id', restaurantId)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate),
  ]);

  if (ordersResult.error) throw new Error(`getPurchaseSummary orders: ${ordersResult.error.message}`);
  if (expensesResult.error) throw new Error(`getPurchaseSummary expenses: ${expensesResult.error.message}`);

  const orders = (ordersResult.data ?? []) as Array<{ total_amount: number }>;
  const expenses = (expensesResult.data ?? []) as Array<{ amount: number }>;

  const totalOrdersAmount = orders.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const totalExpensesAmount = expenses.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return {
    total_orders_amount: totalOrdersAmount,
    order_count: orders.length,
    total_expenses_amount: totalExpensesAmount,
    expense_count: expenses.length,
    combined_total: totalOrdersAmount + totalExpensesAmount,
    currency,
  };
}
