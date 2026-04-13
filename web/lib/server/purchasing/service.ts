// Purchasing domain service layer.
// Route handlers call functions here, not queries directly.
// All functions take restaurantId as an explicit parameter — never trust request body for tenant identity.

import type { Supplier, PurchaseOrder, PurchaseOrderWithItems, Expense, PurchaseSummary } from './types';
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
import * as queries from './queries';

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers
// ─────────────────────────────────────────────────────────────────────────────

export async function getSuppliers(
  restaurantId: string,
  includeInactive = false
): Promise<Supplier[]> {
  return queries.listSuppliers(restaurantId, includeInactive);
}

export async function getSupplier(
  id: string,
  restaurantId: string
): Promise<Supplier> {
  const supplier = await queries.getSupplierById(id, restaurantId);
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }
  return supplier;
}

export async function addSupplier(
  restaurantId: string,
  input: CreateSupplierInput,
  createdBy: string | null
): Promise<Supplier> {
  return queries.createSupplier(restaurantId, input, createdBy);
}

export async function editSupplier(
  id: string,
  restaurantId: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  await getSupplier(id, restaurantId); // 404 if not found
  return queries.updateSupplier(id, restaurantId, input);
}

export async function archiveSupplier(
  id: string,
  restaurantId: string
): Promise<void> {
  await getSupplier(id, restaurantId); // 404 if not found
  return queries.deleteSupplier(id, restaurantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Orders
// ─────────────────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(
  restaurantId: string,
  filters: ListPurchaseOrdersInput
): Promise<PurchaseOrder[]> {
  return queries.listPurchaseOrders(restaurantId, filters);
}

export async function getPurchaseOrder(
  id: string,
  restaurantId: string
): Promise<PurchaseOrderWithItems> {
  const order = await queries.getPurchaseOrderById(id, restaurantId);
  if (!order) {
    throw Object.assign(new Error('Purchase order not found'), { status: 404 });
  }
  return order;
}

export async function addPurchaseOrder(
  restaurantId: string,
  input: CreatePurchaseOrderInput,
  createdBy: string | null
): Promise<PurchaseOrderWithItems> {
  // If supplier_id provided, denormalize supplier name for longevity
  let supplierName = input.supplier_name ?? null;
  if (input.supplier_id && !supplierName) {
    const supplier = await queries.getSupplierById(input.supplier_id, restaurantId);
    if (!supplier) {
      throw Object.assign(
        new Error('Supplier not found in this branch'),
        { status: 422 }
      );
    }
    supplierName = supplier.name;
  }

  return queries.createPurchaseOrder(restaurantId, { ...input, supplier_name: supplierName }, createdBy);
}

export async function editPurchaseOrder(
  id: string,
  restaurantId: string,
  input: UpdatePurchaseOrderInput
): Promise<PurchaseOrder> {
  await getPurchaseOrder(id, restaurantId); // 404 if not found
  return queries.updatePurchaseOrder(id, restaurantId, input);
}

export async function removePurchaseOrder(
  id: string,
  restaurantId: string
): Promise<void> {
  await getPurchaseOrder(id, restaurantId); // 404 if not found
  return queries.deletePurchaseOrder(id, restaurantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenses(
  restaurantId: string,
  filters: ListExpensesInput
): Promise<Expense[]> {
  return queries.listExpenses(restaurantId, filters);
}

export async function getExpense(
  id: string,
  restaurantId: string
): Promise<Expense> {
  const expense = await queries.getExpenseById(id, restaurantId);
  if (!expense) {
    throw Object.assign(new Error('Expense not found'), { status: 404 });
  }
  return expense;
}

export async function addExpense(
  restaurantId: string,
  input: CreateExpenseInput,
  createdBy: string | null
): Promise<Expense> {
  return queries.createExpense(restaurantId, input, createdBy);
}

export async function editExpense(
  id: string,
  restaurantId: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  await getExpense(id, restaurantId); // 404 if not found
  return queries.updateExpense(id, restaurantId, input);
}

export async function removeExpense(
  id: string,
  restaurantId: string
): Promise<void> {
  await getExpense(id, restaurantId); // 404 if not found
  return queries.deleteExpense(id, restaurantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

export async function getPurchaseSummaryForPeriod(
  restaurantId: string,
  fromDate: string,
  toDate: string,
  currency = 'JPY'
): Promise<PurchaseSummary> {
  return queries.getPurchaseSummary(restaurantId, fromDate, toDate, currency);
}
