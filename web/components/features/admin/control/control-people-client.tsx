'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Mail,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
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
import { MembersPanel, type OrgBranch } from '@/components/features/admin/organization/MembersPanel';
import type {
  ApiOrganizationMember,
  ApiPendingInvite,
  OrgEmployee,
} from '@/shared/types/organization';
import { ORG_ROLE_LABELS } from '@/shared/types/organization';
import type { OrgMemberRole } from '@/shared/types/organization';
import { cn } from '@/lib/utils';

interface ControlPeopleClientProps {
  locale: string;
  members: ApiOrganizationMember[];
  pendingInvites: ApiPendingInvite[];
  branches: OrgBranch[];
  employees: OrgEmployee[];
  canManage: boolean;
  canViewEmployees: boolean;
}

const ROLE_COLORS: Record<OrgMemberRole, string> = {
  founder_full_control: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  founder_operations: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  founder_finance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  accountant_readonly: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  branch_general_manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

export function ControlPeopleClient({
  members: initialMembers,
  pendingInvites: initialInvites,
  branches,
  employees,
  canManage,
  canViewEmployees,
}: ControlPeopleClientProps) {
  const appLocale = useLocale();
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const pendingCount = pendingInvites.filter((i) => i.is_active && !i.accepted_at).length;
  const branchScopedCount = members.filter((m) => m.shop_scope === 'selected_shops').length;

  const branchNameById = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [mRes, iRes] = await Promise.all([
        fetch('/api/v1/owner/organization/members'),
        fetch('/api/v1/owner/organization/invites'),
      ]);
      if (mRes.ok) setMembers((await mRes.json()).members ?? []);
      if (iRes.ok) setPendingInvites((await iRes.json()).invites ?? []);
    } finally {
      setRefreshing(false);
    }
  };

  const goToTeam = (restaurantId: string) => {
    router.push(`/${appLocale}/control/restaurants/${restaurantId}?tab=team`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">People</h1>
          <p className="text-sm text-muted-foreground">
            Organization access and branch staffing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={handleRefresh}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setShowInvitePanel((prev) => !prev)}
              className="gap-1.5 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              {showInvitePanel ? 'Close' : 'Manage access'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Active members</p>
          <p className="text-xl font-semibold">{members.length}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Pending invites</p>
          <p className={cn('text-xl font-semibold', pendingCount > 0 && 'text-amber-600')}>
            {pendingCount}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Total employees</p>
          <p className="text-xl font-semibold">{employees.length}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Branch-scoped members</p>
          <p className="text-xl font-semibold">{branchScopedCount}</p>
        </div>
      </div>

      {/* Organization members table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Organization access</h2>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Scope</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {(m.name ?? m.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate max-w-40">
                          {m.name ?? m.email}
                        </p>
                        {m.name && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-40">{m.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        ROLE_COLORS[m.role] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {ORG_ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {m.shop_scope === 'selected_shops' ? (
                      <span className="text-xs">
                        {(m.accessible_restaurant_ids ?? [])
                          .map((id) => branchNameById[id] ?? id)
                          .join(', ') || 'No branches'}
                      </span>
                    ) : (
                      'All branches'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.is_active ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {pendingInvites
                .filter((i) => i.is_active && !i.accepted_at)
                .map((invite) => (
                  <TableRow key={invite.id} className="opacity-60">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-tight truncate max-w-40">{invite.email}</p>
                          <p className="text-[11px] text-muted-foreground">Invite sent</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          ROLE_COLORS[invite.role as OrgMemberRole] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {ORG_ROLE_LABELS[invite.role as OrgMemberRole] ?? invite.role}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {invite.shop_scope === 'selected_shops' ? 'Selected branches' : 'All branches'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

              {members.length === 0 && pendingInvites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Branch staffing summary */}
      {canViewEmployees && branches.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium">Branch staffing</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead className="text-right pr-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => {
                  const count = employees.filter((e) => e.restaurant_id === branch.id).length;
                  return (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{branch.name}</p>
                            <p className="text-[11px] text-muted-foreground hidden sm:block">
                              {branch.subdomain}.coorder.ai
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {count}
                        </div>
                      </TableCell>
                      <TableCell className="pr-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-lg text-xs"
                          onClick={() => goToTeam(branch.id)}
                        >
                          Manage team
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Invite panel (full MembersPanel shown as a slide-in area) */}
      {showInvitePanel && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Manage access</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={() => setShowInvitePanel(false)}
            >
              ×
            </Button>
          </div>
          <div className={refreshing ? 'pointer-events-none opacity-60' : ''}>
            <MembersPanel
              members={members}
              pendingInvites={pendingInvites}
              branches={branches}
              canManage={canManage}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      )}
    </div>
  );
}
