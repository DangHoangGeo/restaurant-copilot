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

function roundCurrencyAmount(value: number): number {
  return Number(value.toFixed(2));
}

function calculatePurchaseOrderTotal(
  items: CreatePurchaseOrderInput['items'],
  taxAmount: number | null | undefined
): number | null {
  if (!items || items.length === 0) return null;

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  return roundCurrencyAmount(itemsTotal + (taxAmount ?? 0));
}

async function resolveSupplierName(params: {
  restaurantId: string;
  supplierId?: string | null;
  supplierName?: string | null;
}): Promise<string | null | undefined> {
  const { restaurantId, supplierId, supplierName } = params;

  if (!supplierId) return supplierName;

  const supplier = await queries.getSupplierById(supplierId, restaurantId);
  if (!supplier) {
    throw Object.assign(
      new Error('Supplier not found in this branch'),
      { status: 422 }
    );
  }

  return supplier.name;
}

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
  const supplierName = await resolveSupplierName({
    restaurantId,
    supplierId: input.supplier_id,
    supplierName: input.supplier_name ?? null,
  });

  const computedTotal = calculatePurchaseOrderTotal(input.items, input.tax_amount);

  return queries.createPurchaseOrder(
    restaurantId,
    {
      ...input,
      supplier_name: supplierName ?? null,
      total_amount: computedTotal ?? input.total_amount,
    },
    createdBy
  );
}

export async function editPurchaseOrder(
  id: string,
  restaurantId: string,
  input: UpdatePurchaseOrderInput
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id, restaurantId); // 404 if not found

  let supplierName = input.supplier_name;
  if (Object.prototype.hasOwnProperty.call(input, 'supplier_id')) {
    supplierName = await resolveSupplierName({
      restaurantId,
      supplierId: input.supplier_id,
      supplierName:
        input.supplier_id === null
          ? input.supplier_name ?? existing.supplier_name
          : input.supplier_name,
    });
  }

  return queries.updatePurchaseOrder(id, restaurantId, {
    ...input,
    supplier_name: supplierName,
  });
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
