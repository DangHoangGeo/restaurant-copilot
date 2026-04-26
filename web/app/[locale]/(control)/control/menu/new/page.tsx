import { notFound } from "next/navigation";
import { ProfessionalMenuItemEditor } from "@/components/features/admin/menu/professional-menu-item-editor";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { listOrganizationSharedMenu } from "@/lib/server/organizations/shared-menu";

export default async function NewControlMenuItemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();

  if (!ctx) notFound();

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("restaurant_settings")) notFound();

  const categories = await listOrganizationSharedMenu(ctx.organization.id);
  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <ProfessionalMenuItemEditor
      mode="organization-shared"
      categories={activeCategories.map((category) => ({
        id: category.id,
        name_en: category.name_en,
        name_ja: category.name_ja,
        name_vi: category.name_vi,
        itemCount: category.items.length,
      }))}
      locale={locale}
      returnHref={`/${locale}/control/menu`}
      restaurantName={ctx.organization.name}
    />
  );
}
