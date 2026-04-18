import { NextRequest, NextResponse } from 'next/server';
import {
  CreateExpenseSchema,
  ListExpensesSchema,
} from '@/lib/server/purchasing/schemas';
import { resolveScopedBranchPurchasingAccess } from '@/lib/server/purchasing/access';
import { addExpense, getExpenses } from '@/lib/server/purchasing/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function getCreatorName(userId: string | null): Promise<string | null> {
  if (!userId) return null;

  const { data } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  return (data?.name as string | null) ?? (data?.email as string | null) ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;
  const access = await resolveScopedBranchPurchasingAccess(branchId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = {
    category: searchParams.get('category') ?? undefined,
    from_date: searchParams.get('from_date') ?? undefined,
    to_date: searchParams.get('to_date') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  };

  const parsed = ListExpensesSchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const expenses = await getExpenses(access.restaurantId, parsed.data);
    const creatorIds = Array.from(
      new Set(expenses.map((expense) => expense.created_by).filter(Boolean) as string[])
    );
    const { data: users } = creatorIds.length
      ? await supabaseAdmin.from('users').select('id, name, email').in('id', creatorIds)
      : { data: [] as Array<{ id: string; name: string | null; email: string | null }> };
    const creatorMap = new Map<string, string>();
    for (const user of users ?? []) {
      const label = user.name ?? user.email;
      if (label) creatorMap.set(user.id, label);
    }

    return NextResponse.json({
      expenses: expenses.map((expense) => ({
        ...expense,
        created_by_name: expense.created_by ? creatorMap.get(expense.created_by) ?? null : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch expenses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;
  const access = await resolveScopedBranchPurchasingAccess(branchId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!access.canWrite) {
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
    const expense = await addExpense(access.restaurantId, parsed.data, access.userId);
    const created_by_name = await getCreatorName(expense.created_by);
    return NextResponse.json(
      { expense: { ...expense, created_by_name } },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
