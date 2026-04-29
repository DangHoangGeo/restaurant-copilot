import { ProtectedLayout } from "@/components/ProtectedLayout";
import { AdminLayoutClient } from "./admin-layout-client";
import { getTranslations } from "next-intl/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { redirect } from "next/navigation";
import { FOUNDER_CONTROL_ROLES } from "@/lib/server/control/access";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import type { OrgPermission } from "@/lib/server/organizations/types";

const ALL_BRANCH_PERMISSIONS: OrgPermission[] = [
  "reports",
  "finance_exports",
  "purchases",
  "promotions",
  "employees",
  "attendance_approvals",
  "restaurant_settings",
  "organization_settings",
  "billing",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.dashboard" });
  return {
    title: t("metadata.admin_dashboard_title"),
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [user, resolvedParams, organizationContext] = await Promise.all([
    getUserFromRequest(),
    params,
    resolveOrgContext(),
  ]);
  const locale = resolvedParams.locale || "en";

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const restaurantSettings = user.restaurantSettings;
  const tCommon = await getTranslations({
    locale,
    namespace: "common.layout_errors",
  });

  // Build the initialUser shape expected by ProtectedLayout so it can pre-populate
  // the client-side auth context without a separate API call.
  const initialUser = {
    id: user.userId,
    name: "",
    email: user.email ?? "",
    role: user.role ?? "",
    restaurantId: user.restaurantId ?? "",
    subdomain: user.subdomain ?? "",
    restaurant: restaurantSettings
      ? {
          id: restaurantSettings.id,
          name: restaurantSettings.name,
          subdomain: restaurantSettings.subdomain,
          logoUrl: restaurantSettings.logoUrl ?? undefined,
          brandColor: restaurantSettings.primaryColor,
          defaultLanguage: restaurantSettings.defaultLocale,
          onboarded: restaurantSettings.onboarded,
        }
      : null,
  };

  const authz = buildAuthorizationService(organizationContext);
  const branchPermissions = Object.fromEntries(
    ALL_BRANCH_PERMISSIONS.map((permission) => [
      permission,
      organizationContext ? Boolean(authz?.can(permission)) : true,
    ]),
  ) as Record<OrgPermission, boolean>;
  const ownerControlHref =
    organizationContext &&
    FOUNDER_CONTROL_ROLES.includes(organizationContext.member.role) &&
    organizationContext.member.role !== "accountant_readonly"
      ? `/${locale}/control/restaurants`
      : null;

  if (!restaurantSettings && user.subdomain) {
    const MOCK_RESTAURANT_INFO_FALLBACK = {
      name: tCommon("fallbackRestaurantName"),
      logoUrl: null,
      subdomain: user.subdomain,
      primaryColor: "#c8773e",
    } as const;
    return (
      <ProtectedLayout initialUser={initialUser}>
        <AdminLayoutClient
          locale={locale}
          restaurantSettings={MOCK_RESTAURANT_INFO_FALLBACK}
          ownerControlHref={ownerControlHref}
          branchPermissions={branchPermissions}
        >
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">
              {tCommon("configurationErrorTitle")}
            </h1>
            <p className="text-muted-foreground">
              {tCommon("configurationErrorDescription", {
                subdomain: user.subdomain,
              })}
            </p>
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  if (!restaurantSettings && !user.subdomain) {
    const GENERIC_ADMIN_SETTINGS = {
      name: tCommon("adminPanelTitle"),
      logoUrl: null,
      subdomain: "admin",
      primaryColor: "#c8773e",
    } as const;
    return (
      <ProtectedLayout initialUser={initialUser}>
        <AdminLayoutClient
          locale={locale}
          restaurantSettings={GENERIC_ADMIN_SETTINGS}
          ownerControlHref={ownerControlHref}
          branchPermissions={branchPermissions}
        >
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">
              {tCommon("noRestaurantContextTitle")}
            </h1>
            <p className="text-muted-foreground">
              {tCommon("noRestaurantContextDescription")}
            </p>
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout initialUser={initialUser}>
      <AdminLayoutClient
        locale={locale}
        restaurantSettings={restaurantSettings!}
        ownerControlHref={ownerControlHref}
        branchPermissions={branchPermissions}
      >
        {children}
      </AdminLayoutClient>
    </ProtectedLayout>
  );
}
