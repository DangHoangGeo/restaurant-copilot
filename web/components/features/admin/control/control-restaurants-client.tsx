'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  companyPublicSubdomain: string | null;
  sharedMenuCategories: OrganizationSharedMenuCategory[];
}

type Panel = 'none' | 'copy' | 'compare';

export function ControlRestaurantsClient({
  branches: initialBranches,
  canAddBranch,
  canManageMenu,
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
        <ControlSharedMenuPanel categories={sharedMenuCategories} />
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Restaurant</TableHead>
                <TableHead className="hidden sm:table-cell">Public entry</TableHead>
                <TableHead className="hidden md:table-cell text-center">Employees</TableHead>
                <TableHead className="w-24 pr-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow
                  key={branch.id}
                  className="cursor-pointer"
                  onClick={() => handleOpen(branch.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight truncate max-w-40">{branch.name}</p>
                        {branch.isActive && (
                          <Badge variant="secondary" className="mt-0.5 text-[9px] h-4 px-1.5 rounded-full">active</Badge>
                        )}
                        {branch.branchCode ? (
                          <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">
                            branch {branch.branchCode}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{companyPublicSubdomain ? `${companyPublicSubdomain}.coorder.ai` : `${branch.subdomain}.coorder.ai`}</p>
                      <p className="text-xs">
                        branch {branch.branchCode ?? branch.subdomain}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {branch.employeeCount ?? 0}
                    </div>
                  </TableCell>
                  <TableCell className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-lg text-xs"
                      onClick={() => handleOpen(branch.id)}
                    >
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
