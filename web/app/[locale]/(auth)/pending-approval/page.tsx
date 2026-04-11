import Link from 'next/link';
import { Clock3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-blue-600 mb-4">
          <Clock3 className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Account Pending Approval</h1>
        </div>

        <p className="text-muted-foreground mb-4">
          Thanks for registering your restaurant. Your account is created, but an admin must approve it before you can use dashboard and operational APIs.
        </p>

        <div className="rounded-lg border bg-muted/40 p-4 mb-6 text-sm">
          <div className="flex items-center gap-2 font-medium mb-2">
            <ShieldCheck className="h-4 w-4" />
            Why this is required
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Blocks unverified tenants from immediately using protected resources.</li>
            <li>Reduces abuse from spam and automated account creation.</li>
            <li>Supports secure rollout of free trial now and paid subscription later.</li>
          </ul>
        </div>

        <Button asChild>
          <Link href="../login">Back to login</Link>
        </Button>
      </div>
    </main>
  );
}
