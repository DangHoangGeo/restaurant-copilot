"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MembersPanel } from "@/components/features/admin/organization/MembersPanel";
import { Building2, Globe, Clock, Coins } from "lucide-react";
import type {
  ApiOrganization,
  ApiOrganizationMember,
  ApiPendingInvite,
  OrgMemberRole,
} from "@/shared/types/organization";
import { ORG_ROLE_LABELS } from "@/shared/types/organization";

export interface OrgBranch {
  id: string;
  name: string;
  subdomain: string;
}

interface OrganizationPageClientProps {
  organization: ApiOrganization;
  currentMemberRole: OrgMemberRole;
  members: ApiOrganizationMember[];
  pendingInvites: ApiPendingInvite[];
  /** Branches this member can access, with real names — used by the invite form picker. */
  branches: OrgBranch[];
  canManage: boolean;
}

export function OrganizationPageClient({
  organization,
  currentMemberRole,
  members: initialMembers,
  pendingInvites: initialInvites,
  branches,
  canManage,
}: OrganizationPageClientProps) {
  const t = useTranslations("owner.organization");

  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/v1/owner/organization/members"),
        fetch("/api/v1/owner/organization/invites"),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members ?? []);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setPendingInvites(data.invites ?? []);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      {/* Organization header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{organization.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("yourRole")}: <strong>{ORG_ROLE_LABELS[currentMemberRole]}</strong>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>{organization.country}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{organization.timezone}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-3.5 w-3.5 shrink-0" />
            <span>{organization.currency}</span>
          </div>
        </div>
      </div>

      {/* Members panel */}
      <div className={refreshing ? "opacity-60 pointer-events-none" : ""}>
        <MembersPanel
          members={members}
          pendingInvites={pendingInvites}
          branches={branches}
          canManage={canManage}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
