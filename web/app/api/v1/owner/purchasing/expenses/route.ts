// GET  /api/v1/owner/purchasing/expenses — list expenses for the branch
// POST /api/v1/owner/purchasing/expenses — record a new quick expense
//
// Query params for GET (all optional):
//   category, from_date, to_date, limit, offset

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { CreateExpenseSchema, ListExpensesSchema } from '@/lib/server/purchasing/schemas';
import { getExpenses, addExpense } from '@/lib/server/purchasing/service';

const ALLOWED_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER] as const;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = {
    category:  searchParams.get('category')  ?? undefined,
    from_date: searchParams.get('from_date') ?? undefined,
    to_date:   searchParams.get('to_date')   ?? undefined,
    limit:     searchParams.get('limit')     ?? undefined,
    offset:    searchParams.get('offset')    ?? undefined,
  };

  const parsed = ListExpensesSchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const expenses = await getExpenses(user.restaurantId, parsed.data);
    return NextResponse.json({ expenses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch expenses';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role as 'owner' | 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const expense = await addExpense(user.restaurantId, parsed.data, user.userId);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to record expense';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
