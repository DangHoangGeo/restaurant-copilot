import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ensureBranchRouteContext } from "@/lib/server/organizations/branch-route";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { buildBranchPath } from "@/lib/branch-paths";
import { DashboardClientContent } from "../../dashboard-client-content";
import { OrdersClientContent } from "../../orders/orders-client-content";
import { MenuClientContent } from "../../menu/menu-client-content";
import { ProfessionalMenuItemEditor } from "@/components/features/admin/menu/professional-menu-item-editor";
import { TablesClientContent } from "../../tables/tables-client-content";
import { BookingsClientContent } from "../../bookings/bookings-client-content";
import { ReportsClientContent } from "../../reports/reports-client-content";
import EmployeesClientContent from "../../employees/employees-client-content";
import PurchasingPage from "../../purchasing/page";
import FinancePage from "../../finance/page";
import PromotionsPage from "../../promotions/page";
import StaffPage from "../../staff/page";
import ProfilePage from "../../profile/page";
import OnboardingPage from "../../onboarding/page";
import { getBranchMenuWorkspace } from "@/lib/server/organizations/menu-inheritance";

type BranchSearchParams = Record<string, string | string[] | undefined>;

const BRANCH_PAGE_CLASS = "mx-auto w-full max-w-[1440px]";

export default async function BranchScopedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; branchId: string; slug?: string[] }>;
  searchParams: Promise<BranchSearchParams>;
}) {
  const [{ locale, branchId, slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  setRequestLocale(locale);

  const routeSlug = slug ?? [];
  if (
    routeSlug.length > 1 &&
    !(routeSlug[0] === "menu" && routeSlug[1] === "new")
  ) {
    notFound();
  }

  const suffix = routeSlug.length === 0 ? "" : routeSlug[0];

  await ensureBranchRouteContext({
    locale,
    branchId,
    suffix,
    searchParams: resolvedSearchParams,
  });

  switch (routeSlug[0]) {
    case undefined:
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <DashboardClientContent />
        </div>
      );
    case "orders":
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <OrdersClientContent />
        </div>
      );
    case "menu":
      if (routeSlug[1] === "new") {
        const workspace = await getBranchMenuWorkspace(branchId);
        return (
          <div className={BRANCH_PAGE_CLASS}>
            <ProfessionalMenuItemEditor
              mode="branch"
              branchId={branchId}
              categories={workspace.categories.map((category) => ({
                id: category.id,
                name_en: category.name_en,
                name_ja: category.name_ja,
                name_vi: category.name_vi,
                itemCount: category.menu_items.length,
              }))}
              locale={locale}
              returnHref={buildBranchPath(locale, branchId, "menu")}
            />
          </div>
        );
      }
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <MenuClientContent branchId={branchId} />
        </div>
      );
    case "tables":
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <TablesClientContent />
        </div>
      );
    case "bookings":
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <BookingsClientContent />
        </div>
      );
    case "reports":
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <ReportsClientContent />
        </div>
      );
    case "employees":
      return (
        <div className={BRANCH_PAGE_CLASS}>
          <EmployeesClientContent />
        </div>
      );
    case "purchasing":
      return <PurchasingPage params={Promise.resolve({ locale, branchId })} />;
    case "finance":
      return (
        <FinancePage
          params={Promise.resolve({ locale, branchId })}
          searchParams={Promise.resolve({
            year:
              typeof resolvedSearchParams.year === "string"
                ? resolvedSearchParams.year
                : undefined,
            month:
              typeof resolvedSearchParams.month === "string"
                ? resolvedSearchParams.month
                : undefined,
          })}
        />
      );
    case "promotions":
      return <PromotionsPage params={Promise.resolve({ locale, branchId })} />;
    case "staff":
      return <StaffPage params={Promise.resolve({ locale, branchId })} />;
    case "profile":
      return <ProfilePage />;
    case "onboarding":
      return <OnboardingPage params={Promise.resolve({ locale, branchId })} />;
    case "settings": {
      const founderContext = await resolveFounderControlContext();
      redirect(
        founderContext
          ? `/${locale}/control/settings`
          : buildBranchPath(locale, branchId),
      );
    }
    case "homepage": {
      const founderContext = await resolveFounderControlContext();
      redirect(
        founderContext
          ? `/${locale}/control/homepage`
          : buildBranchPath(locale, branchId),
      );
    }
    case "branches": {
      const founderContext = await resolveFounderControlContext();
      redirect(
        founderContext
          ? `/${locale}/control/restaurants`
          : buildBranchPath(locale, branchId),
      );
    }
    case "organization": {
      const founderContext = await resolveFounderControlContext();
      redirect(
        founderContext
          ? `/${locale}/control/people`
          : buildBranchPath(locale, branchId),
      );
    }
    default:
      notFound();
  }
}
