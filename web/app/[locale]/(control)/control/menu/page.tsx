import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ControlSharedMenuPanel } from "@/components/features/admin/control/control-shared-menu-panel";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import {
  getOrganizationMenuInsights,
  listOrganizationSharedMenu,
} from "@/lib/server/organizations/shared-menu";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.control" });
  return { title: t("menu.title") };
}

export default async function ControlMenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();

  if (!ctx) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("restaurant_settings")) {
    notFound();
  }

  const [categories, insights] = await Promise.all([
    listOrganizationSharedMenu(ctx.organization.id),
    getOrganizationMenuInsights({
      restaurantIds: ctx.accessibleRestaurantIds,
    }),
  ]);

  return (
    <ControlSharedMenuPanel
      categories={categories}
      organizationName={ctx.organization.name}
      locale={locale}
      insights={insights}
    />
  );
}
