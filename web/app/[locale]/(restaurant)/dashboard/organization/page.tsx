import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { listPendingInvites } from "@/lib/server/organizations/invites";
import { OrganizationPageClient } from "./organization-client";
import type { ApiOrganizationMember, ApiPendingInvite } from "@/shared/types/organization";
import {
  listOrganizationMembers,
  listOrganizationBranches,
} from "@/lib/server/organizations/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.organization" });
  return { title: t("pageTitle") };
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const ctx = await resolveOrgContext();
  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const authz = buildAuthorizationService(ctx);
  const canManage = authz?.canManageMembers() ?? false;
  const canEditSettings = authz?.canChangeOrgSettings() ?? false;

  const [rawMembers, rawInvites, branches] = await Promise.all([
    listOrganizationMembers(ctx.organization.id),
    listPendingInvites(ctx.organization.id),
    listOrganizationBranches(ctx.organization.id),
  ]);

  const members: ApiOrganizationMember[] = rawMembers.map((m) => ({
    id: m.id,
    organization_id: m.organization_id,
    user_id: m.user_id,
    role: m.role,
    shop_scope: m.shop_scope,
    joined_at: m.joined_at,
    is_active: m.is_active,
    email: m.email,
    name: m.name,
  }));

  const pendingInvites: ApiPendingInvite[] = rawInvites.map((inv) => ({
    id: inv.id,
    organization_id: inv.organization_id,
    invited_by: inv.invited_by,
    email: inv.email,
    role: inv.role,
    shop_scope: inv.shop_scope,
    selected_restaurant_ids: inv.selected_restaurant_ids,
    expires_at: inv.expires_at,
    accepted_at: inv.accepted_at,
    is_active: inv.is_active,
    created_at: inv.created_at,
  }));

  // Filter branches to only those the current member can access
  const accessibleBranches = branches.filter((b) =>
    ctx.accessibleRestaurantIds.includes(b.id)
  );

  return (
    <OrganizationPageClient
      organization={{
        id: ctx.organization.id,
        name: ctx.organization.name,
        slug: ctx.organization.slug,
        country: ctx.organization.country,
        timezone: ctx.organization.timezone,
        currency: ctx.organization.currency,
        is_active: ctx.organization.is_active,
        created_at: ctx.organization.created_at,
      }}
      currentMemberRole={ctx.member.role}
      members={members}
      pendingInvites={pendingInvites}
      branches={accessibleBranches}
      canManage={canManage}
      canEditSettings={canEditSettings}
    />
  );
}
