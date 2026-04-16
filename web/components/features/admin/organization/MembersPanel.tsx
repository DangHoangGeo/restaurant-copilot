"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type {
  ApiOrganizationMember,
  ApiPendingInvite,
  OrgMemberRole,
  ShopScope,
  OrgPermission,
  MemberPermissionState,
} from "@/shared/types/organization";
import { ORG_ROLE_LABELS } from "@/shared/types/organization";

export interface OrgBranch {
  id: string;
  name: string;
  subdomain: string;
}

interface MembersPanelProps {
  members: ApiOrganizationMember[];
  pendingInvites: ApiPendingInvite[];
  branches: OrgBranch[];
  canManage: boolean;
  onRefresh: () => void;
}

function RoleBadge({ role }: { role: OrgMemberRole }) {
  const label = ORG_ROLE_LABELS[role] ?? role;
  const colorMap: Record<OrgMemberRole, string> = {
    founder_full_control:   "bg-purple-100 text-purple-800",
    founder_operations:     "bg-blue-100 text-blue-800",
    founder_finance:        "bg-green-100 text-green-800",
    accountant_readonly:    "bg-yellow-100 text-yellow-800",
    branch_general_manager: "bg-orange-100 text-orange-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        colorMap[role] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {label}
    </span>
  );
}

// ─── Invite form ─────────────────────────────────────────────────────────────

function InviteForm({
  branches,
  onSuccess,
  onCancel,
}: {
  branches: OrgBranch[];
  onSuccess: (token: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("owner.organization");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("founder_operations");
  const [shopScope, setShopScope] = useState<ShopScope>("all_shops");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ROLE_OPTIONS: OrgMemberRole[] = [
    "founder_full_control",
    "founder_operations",
    "founder_finance",
    "accountant_readonly",
    "branch_general_manager",
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (shopScope === "selected_shops" && selectedBranchIds.length === 0) {
      setError(t("selectAtLeastOneBranch"));
      return;
    }

    setLoading(true);
    try {
      const body = {
        email,
        role,
        shop_scope: shopScope,
        selected_restaurant_ids:
          shopScope === "selected_shops" ? selectedBranchIds : undefined,
      };

      const res = await fetch("/api/v1/owner/organization/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("inviteError"));
        return;
      }

      onSuccess(data.invite_token);
    } catch {
      setError(t("inviteError"));
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (id: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-muted/40 p-4 space-y-4">
      <h3 className="text-sm font-semibold">{t("inviteTitle")}</h3>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-email">
          {t("emailLabel")}
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t("emailPlaceholder")}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-role">
          {t("roleLabel")}
        </label>
        <div className="relative">
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgMemberRole)}
            className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{t("scopeLabel")}</label>
        <div className="flex gap-3">
          {(["all_shops", "selected_shops"] as ShopScope[]).map((scope) => (
            <label key={scope} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                value={scope}
                checked={shopScope === scope}
                onChange={() => setShopScope(scope)}
                className="h-4 w-4 accent-primary"
              />
              {t(scope === "all_shops" ? "scopeAllShops" : "scopeSelectedShops")}
            </label>
          ))}
        </div>
      </div>

      {shopScope === "selected_shops" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("selectBranchesLabel")}
          </label>
          {branches.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noBranchesAvailable")}</p>
          ) : (
            <div className="space-y-1 rounded-md border bg-background p-2">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 cursor-pointer text-sm px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{branch.name}</span>
                  <span className="text-xs text-muted-foreground">({branch.subdomain})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sendInvite")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

// ─── Invite token card ────────────────────────────────────────────────────────

function InviteTokenCard({
  token,
  title,
  note,
  onDone,
}: {
  token: string;
  title: string;
  note: string;
  onDone: () => void;
}) {
  const t = useTranslations("owner.organization");
  const [copied, setCopied] = useState(false);

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="text-xs text-green-700/80">{note}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-2 py-1.5 text-xs font-mono truncate border border-green-200">
          {token}
        </code>
        <Button size="sm" variant="outline" onClick={copyToken} className="shrink-0 border-green-300">
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={onDone} className="text-green-700">
        {t("done")}
      </Button>
    </div>
  );
}

// ─── Edit member form ─────────────────────────────────────────────────────────

function EditMemberForm({
  member,
  branches,
  onSaved,
  onCancel,
}: {
  member: ApiOrganizationMember;
  branches: OrgBranch[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("owner.organization");
  const [role, setRole] = useState<OrgMemberRole>(member.role);
  const [shopScope, setShopScope] = useState<ShopScope>(member.shop_scope);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ROLE_OPTIONS: OrgMemberRole[] = [
    "founder_full_control",
    "founder_operations",
    "founder_finance",
    "accountant_readonly",
    "branch_general_manager",
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (shopScope === "selected_shops" && selectedBranchIds.length === 0) {
      setError(t("selectAtLeastOneBranch"));
      return;
    }

    setLoading(true);
    try {
      const body = {
        role,
        shop_scope: shopScope,
        selected_restaurant_ids:
          shopScope === "selected_shops" ? selectedBranchIds : undefined,
      };

      const res = await fetch(`/api/v1/owner/organization/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("editMemberError"));
        return;
      }

      onSaved();
    } catch {
      setError(t("editMemberError"));
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (id: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-3"
    >
      <p className="text-xs font-semibold text-muted-foreground">{t("editMemberTitle")}</p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`role-${member.id}`}>
          {t("roleLabel")}
        </label>
        <div className="relative">
          <select
            id={`role-${member.id}`}
            value={role}
            onChange={(e) => setRole(e.target.value as OrgMemberRole)}
            className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{t("scopeLabel")}</label>
        <div className="flex gap-3">
          {(["all_shops", "selected_shops"] as ShopScope[]).map((scope) => (
            <label key={scope} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                value={scope}
                checked={shopScope === scope}
                onChange={() => setShopScope(scope)}
                className="h-4 w-4 accent-primary"
              />
              {t(scope === "all_shops" ? "scopeAllShops" : "scopeSelectedShops")}
            </label>
          ))}
        </div>
      </div>

      {shopScope === "selected_shops" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("selectBranchesLabel")}
          </label>
          {branches.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noBranchesAvailable")}</p>
          ) : (
            <div className="space-y-1 rounded-md border bg-background p-2">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 cursor-pointer text-sm px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{branch.name}</span>
                  <span className="text-xs text-muted-foreground">({branch.subdomain})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveChanges")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

// ─── Permission editor ────────────────────────────────────────────────────────

function PermissionEditor({
  memberId,
  onClose,
}: {
  memberId: string;
  onClose: () => void;
}) {
  const t = useTranslations("owner.organization");
  const [permissions, setPermissions] = useState<MemberPermissionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Local draft overrides: permission → boolean | undefined (undefined = use fetched value)
  const [draft, setDraft] = useState<Partial<Record<OrgPermission, boolean>>>({});

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/owner/organization/members/${memberId}/permissions`
      );
      if (!res.ok) {
        setError(t("permissionsLoadError"));
        return;
      }
      const data = await res.json();
      setPermissions(data.permissions ?? []);
      setDraft({});
    } catch {
      setError(t("permissionsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [memberId, t]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleToggle = (permission: OrgPermission, value: boolean) => {
    setDraft((prev) => ({ ...prev, [permission]: value }));
    setSaved(false);
  };

  const hasDraftChanges = Object.keys(draft).length > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/owner/organization/members/${memberId}/permissions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: draft }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("permissionsSaveError"));
        return;
      }
      const data = await res.json();
      setPermissions(data.permissions ?? []);
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t("permissionsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t("confirmResetPermissions"))) return;
    setResetting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/owner/organization/members/${memberId}/permissions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reset: true }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("permissionsSaveError"));
        return;
      }
      const data = await res.json();
      setPermissions(data.permissions ?? []);
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t("permissionsSaveError"));
    } finally {
      setResetting(false);
    }
  };

  const getEffectiveValue = (perm: MemberPermissionState): boolean => {
    if (draft[perm.permission] !== undefined) return draft[perm.permission]!;
    return perm.granted;
  };

  const isDraftChanged = (perm: MemberPermissionState): boolean =>
    draft[perm.permission] !== undefined &&
    draft[perm.permission] !== perm.granted;

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("permissionsTitle")}
        </p>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && !error && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t("permissionsSaved")}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("permissionsHint")}</p>
          <div className="space-y-1">
            {permissions.map((perm) => {
              const effective = getEffectiveValue(perm);
              const changed = isDraftChanged(perm);
              return (
                <label
                  key={perm.permission}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium truncate">
                      {t(`permission_${perm.permission}` as Parameters<typeof t>[0])}
                    </span>
                    {perm.is_override && !changed && (
                      <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 shrink-0">
                        {t("permissionOverride")}
                      </span>
                    )}
                    {changed && (
                      <span className="text-[10px] rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 shrink-0">
                        {t("permissionUnsaved")}
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={effective}
                    onChange={(e) => handleToggle(perm.permission, e.target.checked)}
                    className="h-4 w-4 accent-primary shrink-0"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              disabled={!hasDraftChanges || saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveChanges")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={resetting}
              onClick={handleReset}
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("resetToDefaults")
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function MembersPanel({
  members,
  pendingInvites,
  branches,
  canManage,
  onRefresh,
}: MembersPanelProps) {
  const t = useTranslations("owner.organization");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newInviteToken, setNewInviteToken] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [permissionsMemberId, setPermissionsMemberId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendToken, setResendToken] = useState<{ inviteId: string; token: string } | null>(null);

  const handleInviteSuccess = (token: string) => {
    setShowInviteForm(false);
    setNewInviteToken(token);
    onRefresh();
  };

  const removeMember = async (memberId: string) => {
    if (!confirm(t("confirmRemoveMember"))) return;
    setRemovingId(memberId);
    try {
      await fetch(`/api/v1/owner/organization/members/${memberId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setRemovingId(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!confirm(t("confirmRevokeInvite"))) return;
    setRevokingId(inviteId);
    try {
      await fetch(`/api/v1/owner/organization/invites/${inviteId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setRevokingId(null);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setResendingId(inviteId);
    try {
      const res = await fetch(
        `/api/v1/owner/organization/invites/${inviteId}/resend`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setResendToken({ inviteId, token: data.invite_token });
        onRefresh();
      }
    } finally {
      setResendingId(null);
    }
  };

  const handleMemberSaved = useCallback(() => {
    setEditingMemberId(null);
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      {/* Active members */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t("membersTitle")}</h2>
          {canManage && !showInviteForm && !newInviteToken && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInviteForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t("inviteMember")}
            </Button>
          )}
        </div>

        {newInviteToken && (
          <div className="mb-4">
            <InviteTokenCard
              token={newInviteToken}
              title={t("inviteCreated")}
              note={t("inviteTokenNote")}
              onDone={() => setNewInviteToken(null)}
            />
          </div>
        )}

        {showInviteForm && (
          <div className="mb-4">
            <InviteForm
              branches={branches}
              onSuccess={handleInviteSuccess}
              onCancel={() => setShowInviteForm(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noMembers")}
            </p>
          )}
          {members.map((member) => (
            <div key={member.id} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name ?? member.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <RoleBadge role={member.role} />
                  {canManage && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 ${permissionsMemberId === member.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() =>
                          setPermissionsMemberId(
                            permissionsMemberId === member.id ? null : member.id
                          )
                        }
                        aria-label={t("editPermissions")}
                        title={t("editPermissions")}
                      >
                        {permissionsMemberId === member.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setEditingMemberId(
                            editingMemberId === member.id ? null : member.id
                          )
                        }
                        aria-label={t("editMember")}
                      >
                        {editingMemberId === member.id ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(member.id)}
                        disabled={removingId === member.id}
                        aria-label={t("removeMember")}
                      >
                        {removingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editingMemberId === member.id && (
                <div className="px-4 pb-3">
                  <EditMemberForm
                    member={member}
                    branches={branches}
                    onSaved={handleMemberSaved}
                    onCancel={() => setEditingMemberId(null)}
                  />
                </div>
              )}

              {permissionsMemberId === member.id && (
                <div className="px-4 pb-3">
                  <PermissionEditor
                    memberId={member.id}
                    onClose={() => setPermissionsMemberId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {t("pendingInvitesTitle")}
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="rounded-lg border border-dashed bg-muted/40">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-medium truncate">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("expiresAt", {
                        date: new Date(invite.expires_at).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <RoleBadge role={invite.role} />
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => resendInvite(invite.id)}
                          disabled={resendingId === invite.id}
                          aria-label={t("resendInvite")}
                        >
                          {resendingId === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              {t("resendInvite")}
                            </>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => revokeInvite(invite.id)}
                          disabled={revokingId === invite.id}
                          aria-label={t("revokeInvite")}
                        >
                          {revokingId === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Resend token card — shown inline below the invite row */}
                {resendToken?.inviteId === invite.id && (
                  <div className="px-4 pb-3">
                    <InviteTokenCard
                      token={resendToken.token}
                      title={t("resendInviteTitle")}
                      note={t("resendInviteNote")}
                      onDone={() => setResendToken(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
