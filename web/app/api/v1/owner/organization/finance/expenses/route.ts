import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrganizationFinanceAccess } from '@/lib/server/finance/access';
import { addOrganizationFinanceExpense } from '@/lib/server/finance/organization';
import { CreateExpenseSchema } from '@/lib/server/purchasing/schemas';

const CreateOrganizationExpenseSchema = CreateExpenseSchema.extend({
  vendor_name: z.string().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const access = await resolveOrganizationFinanceAccess();

  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!access.canManageExpenses) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateOrganizationExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const expense = await addOrganizationFinanceExpense({
      organizationId: access.organizationId,
      userId: access.userId,
      currency: access.currency,
      input: parsed.data,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
