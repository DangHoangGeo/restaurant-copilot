'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Building2,
  Copy,
  GitCompare,
  Globe,
  Layers3,
  Plus,
  Users,
} from 'lucide-react';
import { AddBranchModal } from '@/components/features/admin/branches/AddBranchModal';
import { MenuCopyModal } from '@/components/features/admin/branches/MenuCopyModal';
import { MenuComparePanel } from '@/components/features/admin/branches/MenuComparePanel';
import { ControlSharedMenuPanel } from '@/components/features/admin/control/control-shared-menu-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OrganizationSharedMenuCategory } from '@/lib/server/organizations/shared-menu';

interface Branch {
  id: string;
  name: string;
  subdomain: string;
  branchCode?: string | null;
  employeeCount?: number;
  isActive?: boolean;
}

interface ControlRestaurantsClientProps {
  branches: Branch[];
  canAddBranch: boolean;
  canManageMenu: boolean;
  organizationName?: string;
  companyPublicSubdomain: string | null;
  sharedMenuCategories: OrganizationSharedMenuCategory[];
}

type Panel = 'none' | 'copy' | 'compare';

export function ControlRestaurantsClient({
  branches: initialBranches,
  canAddBranch,
  canManageMenu,
  organizationName,
  companyPublicSubdomain,
  sharedMenuCategories,
}: ControlRestaurantsClientProps) {
  const locale = useLocale();
  const router = useRouter();

  const [branches] = useState(initialBranches);
  const [panel, setPanel] = useState<Panel>('none');
  const [showAddBranch, setShowAddBranch] = useState(false);

  const handleOpen = (branchId: string) => {
    router.push(`/${locale}/control/restaurants/${branchId}`);
  };

  const handleBranchAdded = () => {
    setShowAddBranch(false);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Restaurants</h1>
            <Badge variant="secondary" className="rounded-full">
              {branches.length}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {companyPublicSubdomain ? (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1">
                <Globe className="h-3.5 w-3.5" />
                {companyPublicSubdomain}.coorder.ai
              </span>
            ) : null}
            {canManageMenu ? (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1">
                <Layers3 className="h-3.5 w-3.5" />
                Shared menu ready
              </span>
            ) : null}
          </div>
        </div>
        {canAddBranch && (
          <Button size="sm" onClick={() => setShowAddBranch(true)} className="gap-1.5 rounded-lg">
            <Plus className="h-4 w-4" />
            Add Restaurant
          </Button>
        )}
      </div>

      {/* Multi-menu toolbar — only when 2+ branches */}
      {branches.length >= 2 && canManageMenu && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={panel === 'copy' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setPanel(panel === 'copy' ? 'none' : 'copy')}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy menu
          </Button>
          <Button
            variant={panel === 'compare' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setPanel(panel === 'compare' ? 'none' : 'compare')}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare menus
          </Button>
        </div>
      )}

      {panel === 'copy' && (
        <MenuCopyModal branches={branches} onClose={() => setPanel('none')} />
      )}
      {panel === 'compare' && (
        <MenuComparePanel branches={branches} />
      )}

      {canManageMenu && (
        <ControlSharedMenuPanel
          categories={sharedMenuCategories}
          organizationName={organizationName}
        />
      )}

      {/* Restaurant list */}
      {branches.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No restaurants yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first restaurant to get started.</p>
          {canAddBranch && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-lg gap-1.5"
              onClick={() => setShowAddBranch(true)}
            >
              <Plus className="h-4 w-4" />
              Add restaurant
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-3xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Branch control</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a branch to review setup, schedules, approved hours, and payroll readiness.
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {branches.length} branches
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {branches.map((branch) => (
              <article
                key={branch.id}
                className="rounded-[28px] border bg-card p-4 transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{branch.name}</h3>
                        {branch.isActive ? (
                          <Badge variant="secondary" className="rounded-full">
                            Active branch
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {companyPublicSubdomain
                          ? `${companyPublicSubdomain}.coorder.ai`
                          : `${branch.subdomain}.coorder.ai`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Branch code {branch.branchCode ?? branch.subdomain}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5"
                    onClick={() => handleOpen(branch.id)}
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-muted/20 px-3 py-3">
                    <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Team
                    </div>
                    <p className="mt-2 text-lg font-semibold">{branch.employeeCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">People on roster</p>
                  </div>
                  <div className="rounded-2xl bg-muted/20 px-3 py-3">
                    <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Payroll
                    </div>
                    <p className="mt-2 text-sm font-semibold">Schedules + hours</p>
                    <p className="text-xs text-muted-foreground">View on detail page</p>
                  </div>
                  <div className="rounded-2xl bg-muted/20 px-3 py-3">
                    <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      Public
                    </div>
                    <p className="mt-2 text-sm font-semibold">Customer entry</p>
                    <p className="text-xs text-muted-foreground">Branch-aware link ready</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {showAddBranch && (
        <AddBranchModal
          companyPublicSubdomain={companyPublicSubdomain}
          onClose={() => setShowAddBranch(false)}
          onSuccess={handleBranchAdded}
        />
      )}
    </div>
  );
}
