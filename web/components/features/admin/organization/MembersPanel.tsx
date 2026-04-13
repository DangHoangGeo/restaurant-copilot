"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { ApiOrganizationMember, ApiPendingInvite, OrgMemberRole, ShopScope } from "@/shared/types/organization";
import { ORG_ROLE_LABELS } from "@/shared/types/organization";

export interface OrgBranch {
  id: string;
  name: string;
  subdomain: string;
}

interface MembersPanelProps {
  members: ApiOrganizationMember[];
  pendingInvites: ApiPendingInvite[];
  /** Org branches with real names, used by the invite form scope picker. */
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[role] ?? "bg-gray-100 text-gray-800"}`}>
      {label}
    </span>
  );
}

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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-muted/40 p-4 space-y-4"
    >
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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("sendInvite")
          )}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function InviteTokenCard({ token, onDone }: { token: string; onDone: () => void }) {
  const t = useTranslations("owner.organization");
  const [copied, setCopied] = useState(false);

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{t("inviteCreated")}</p>
      </div>
      <p className="text-xs text-green-700/80">{t("inviteTokenNote")}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-2 py-1.5 text-xs font-mono truncate border border-green-200">
          {token}
        </code>
        <Button size="sm" variant="outline" onClick={copyToken} className="shrink-0 border-green-300">
          {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={onDone} className="text-green-700">
        {t("done")}
      </Button>
    </div>
  );
}

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
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name ?? member.email}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <RoleBadge role={member.role} />
                {canManage && (
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
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">{t("pendingInvitesTitle")}</h2>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-lg border border-dashed bg-muted/40 px-4 py-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("expiresAt", { date: new Date(invite.expires_at).toLocaleDateString() })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <RoleBadge role={invite.role} />
                  {canManage && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
