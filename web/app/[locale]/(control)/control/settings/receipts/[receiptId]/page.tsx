import { notFound } from 'next/navigation';
import { getOrganizationBillingSummary, getOrganizationReceipt } from '@/lib/server/billing/subscriptions';
import { resolveFounderControlContext } from '@/lib/server/control/access';

export default async function ControlReceiptPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const [{ receiptId }, ctx] = await Promise.all([
    params,
    resolveFounderControlContext(),
  ]);

  if (!ctx) {
    notFound();
  }

  const [billing, receipt] = await Promise.all([
    getOrganizationBillingSummary(ctx.organization.id),
    getOrganizationReceipt(ctx.organization.id, receiptId),
  ]);

  if (!billing || !receipt) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl rounded-[32px] border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Subscription receipt
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{receipt.receipt_number}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Issued {new Date(receipt.issued_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium capitalize">{receipt.status}</p>
          <p className="mt-2 text-2xl font-semibold">
            {receipt.currency} {Number(receipt.total).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Company
          </p>
          <p className="mt-2 text-sm font-medium">{ctx.organization.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{billing.restaurantName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Billing period
          </p>
          <p className="mt-2 text-sm font-medium">
            {new Date(receipt.period_start).toLocaleDateString()} -{' '}
            {new Date(receipt.period_end).toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {receipt.billing_cycle} · {billing.planName ?? receipt.plan_id}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-5">
        <div className="flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span>
            {receipt.currency} {Number(receipt.subtotal).toFixed(2)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>
            {receipt.currency} {Number(receipt.total).toFixed(2)}
          </span>
        </div>
      </div>

      {receipt.notes ? (
        <div className="mt-6 rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
          {receipt.notes}
        </div>
      ) : null}
    </div>
  );
}
