import { redirect, notFound } from 'next/navigation';
import { resolveFounderControlContext } from '@/lib/server/control/access';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listOrganizationEmployees } from '@/lib/server/organizations/queries';
import { getBranchOverview } from '@/lib/server/control/branch-overview';
import { ControlBranchDetailClient } from '@/components/features/admin/control/control-branch-detail-client';

export interface BranchSettings {
  id: string;
  name: string;
  subdomain: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  currency: string | null;
  tax: number | null;
  default_language: string | null;
}

export type BranchDetailTab = 'overview' | 'team' | 'setup';

export default async function ControlBranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; branchId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale, branchId }, sp, ctx] = await Promise.all([
    params,
    searchParams,
    resolveFounderControlContext(),
  ]);

  if (!ctx) {
    redirect(`/${locale}/dashboard`);
  }

  if (!ctx.accessibleRestaurantIds.includes(branchId)) {
    notFound();
  }

  const [branchResult, employees, overview] = await Promise.all([
    supabaseAdmin
      .from('restaurants')
      .select('id, name, subdomain, address, phone, email, timezone, currency, tax, default_language')
      .eq('id', branchId)
      .single(),
    listOrganizationEmployees([branchId]),
    getBranchOverview(branchId, ctx.organization.timezone),
  ]);

  if (branchResult.error || !branchResult.data) {
    notFound();
  }

  const branch = branchResult.data as BranchSettings;
  const rawTab = sp.tab;
  const activeTab: BranchDetailTab =
    rawTab === 'team' ? 'team' : rawTab === 'setup' ? 'setup' : 'overview';

  return (
    <ControlBranchDetailClient
      branch={branch}
      employees={employees}
      overview={overview}
      initialTab={activeTab}
      currency={ctx.organization.currency}
      orgTimezone={ctx.organization.timezone}
    />
  );
}
