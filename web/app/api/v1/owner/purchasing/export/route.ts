import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolvePurchasingAccess } from '@/lib/server/purchasing/access';
import { getExpenses, getPurchaseOrders } from '@/lib/server/purchasing/service';

const QuerySchema = z.object({
  type: z.enum(['orders', 'expenses']),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(req: NextRequest) {
  const access = await resolvePurchasingAccess();
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    from_date: searchParams.get('from_date') ?? undefined,
    to_date: searchParams.get('to_date') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'type, from_date, and to_date are required', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, from_date, to_date } = parsed.data;

  try {
    if (type === 'orders') {
      const orders = await getPurchaseOrders(access.restaurantId, {
        from_date,
        to_date,
        limit: 1000,
        offset: 0,
      });

      const rows = [
        ['supplier_name', 'category', 'status', 'order_date', 'received_date', 'total_amount', 'currency', 'tax_amount', 'is_paid', 'paid_at', 'notes'],
        ...orders.map((order) => [
          csvEscape(order.supplier_name),
          csvEscape(order.category),
          csvEscape(order.status),
          csvEscape(order.order_date),
          csvEscape(order.received_date),
          csvEscape(order.total_amount),
          csvEscape(order.currency),
          csvEscape(order.tax_amount),
          csvEscape(order.is_paid),
          csvEscape(order.paid_at),
          csvEscape(order.notes),
        ]),
      ];

      return new NextResponse(`\uFEFF${rows.map((row) => row.join(',')).join('\n')}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="purchase-orders-${from_date}-to-${to_date}.csv"`,
        },
      });
    }

    const expenses = await getExpenses(access.restaurantId, {
      from_date,
      to_date,
      limit: 1000,
      offset: 0,
    });

    const rows = [
      ['category', 'description', 'amount', 'currency', 'expense_date', 'receipt_url', 'notes'],
      ...expenses.map((expense) => [
        csvEscape(expense.category),
        csvEscape(expense.description),
        csvEscape(expense.amount),
        csvEscape(expense.currency),
        csvEscape(expense.expense_date),
        csvEscape(expense.receipt_url),
        csvEscape(expense.notes),
      ]),
    ];

    return new NextResponse(`\uFEFF${rows.map((row) => row.join(',')).join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="expenses-${from_date}-to-${to_date}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export purchasing data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
