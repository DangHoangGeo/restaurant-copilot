"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MembersPanel } from "@/components/features/admin/organization/MembersPanel";
import {
  Building2,
  Globe,
  Clock,
  Coins,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  branches: OrgBranch[];
  canManage: boolean;
  canEditSettings: boolean;
}

function OrgSettingsForm({
  organization,
  onSaved,
  onCancel,
}: {
  organization: ApiOrganization;
  onSaved: (updated: ApiOrganization) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("owner.organization");
  const [name, setName] = useState(organization.name);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [currency, setCurrency] = useState(organization.currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/owner/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("settingsError"));
        return;
      }
      onSaved(data.organization as ApiOrganization);
    } catch {
      setError(t("settingsError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="org-name">
          {t("nameLabel")}
        </label>
        <input
          id="org-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="org-timezone">
          {t("timezoneLabel")}
        </label>
        <input
          id="org-timezone"
          type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          required
          placeholder="Asia/Tokyo"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="org-currency">
          {t("currencyLabel")}
        </label>
        <input
          id="org-currency"
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          required
          maxLength={3}
          minLength={3}
          placeholder="JPY"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveSettings")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

export function OrganizationPageClient({
  organization: initialOrg,
  currentMemberRole,
  members: initialMembers,
  pendingInvites: initialInvites,
  branches,
  canManage,
  canEditSettings,
}: OrganizationPageClientProps) {
  const t = useTranslations("owner.organization");

  const [organization, setOrganization] = useState(initialOrg);
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  const handleSettingsSaved = (updated: ApiOrganization) => {
    setOrganization(updated);
    setEditingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      {/* Organization header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
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

          {canEditSettings && !editingSettings && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-muted-foreground"
              onClick={() => setEditingSettings(true)}
              aria-label={t("editSettings")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {editingSettings && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-muted-foreground"
              onClick={() => setEditingSettings(false)}
              aria-label={t("cancel")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!editingSettings && (
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
        )}

        {settingsSaved && !editingSettings && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t("settingsSaved")}</span>
          </div>
        )}

        {editingSettings && (
          <div className="mt-4">
            <OrgSettingsForm
              organization={organization}
              onSaved={handleSettingsSaved}
              onCancel={() => setEditingSettings(false)}
            />
          </div>
        )}
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
