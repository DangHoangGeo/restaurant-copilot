import { NextRequest, NextResponse } from 'next/server';
import { resolveScopedBranchPurchasingAccess } from '@/lib/server/purchasing/access';
import { removeExpense } from '@/lib/server/purchasing/service';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string; expenseId: string }> }
) {
  const { branchId, expenseId } = await params;
  const access = await resolveScopedBranchPurchasingAccess(branchId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!access.canWrite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await removeExpense(expenseId, access.restaurantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to delete expense';
    return NextResponse.json({ error: message }, { status });
  }
}
