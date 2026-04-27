"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Home,
  ClipboardList,
  TableIcon as TableSimpleIcon,
  UserCog,
  BarChartBig,
  X,
  BookUser,
  List,
  LucideIcon,
  Sparkles,
  ShoppingCart,
  BadgePercent,
  CircleDollarSign,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";
import { cn } from "@/lib/utils";
import { buildBranchPath } from "@/lib/branch-paths";
import type { OrgPermission } from "@/lib/server/organizations/types";

interface AdminSidebarProps {
  restaurantSettings: {
    name: string;
    logoUrl: string | null;
    subdomain?: string;
  };
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  branchPermissions: Record<OrgPermission, boolean>;
}

interface NavItemConfig {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
  featureFlag?: boolean;
  requiredPermission?: OrgPermission;
}

interface NavSection {
  headingKey: string;
  items: NavItemConfig[];
}

interface NavItemProps {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
  isUtility?: boolean;
}

export function AdminSidebar({
  restaurantSettings,
  isOpen,
  setIsOpen,
  branchPermissions,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations("owner.dashboard");
  const locale = (params.locale as string) || "en";
  const branchId = typeof params.branchId === "string" ? params.branchId : null;
  const { needsOnboarding } = useRestaurantSettings();
  const canAccessItem = (item: NavItemConfig) =>
    (item.featureFlag === undefined || item.featureFlag === true) &&
    (!item.requiredPermission || branchPermissions[item.requiredPermission]);

  const navSections: NavSection[] =
    needsOnboarding && FEATURE_FLAGS.onboarding
      ? [
          {
            headingKey: "nav_group_start",
            items: [
              {
                icon: Home,
                labelKey: "admin_sidebar_dashboard",
                href: "/branch",
                exact: true,
              },
              {
                icon: Sparkles,
                labelKey: "admin_sidebar_onboarding",
                href: "/branch/onboarding",
                requiredPermission: "restaurant_settings",
              },
            ],
          },
        ]
      : [
          {
            headingKey: "nav_group_today",
            items: [
              {
                icon: Home,
                labelKey: "admin_sidebar_dashboard",
                href: "/branch",
                exact: true,
              },
              {
                icon: List,
                labelKey: "admin_sidebar_orders",
                href: "/branch/orders",
              },
              {
                icon: ClipboardList,
                labelKey: "admin_sidebar_menu_management",
                href: "/branch/menu",
                requiredPermission: "restaurant_settings",
              },
              {
                icon: TableSimpleIcon,
                labelKey: "admin_sidebar_table_qr_management",
                href: "/branch/tables",
                requiredPermission: "restaurant_settings",
              },
              {
                icon: BookUser,
                labelKey: "admin_sidebar_bookings_preorders",
                href: "/branch/bookings",
                featureFlag: FEATURE_FLAGS.tableBooking,
              },
              {
                icon: BarChartBig,
                labelKey: "admin_sidebar_reports_analytics",
                href: "/branch/reports",
                requiredPermission: "reports",
              },
            ],
          },
          {
            headingKey: "nav_group_people",
            items: [
              {
                icon: UserCog,
                labelKey: "admin_sidebar_employees_schedules",
                href: "/branch/employees",
                requiredPermission: "employees",
              },
            ],
          },
          {
            headingKey: "nav_group_money",
            items: [
              {
                icon: ShoppingCart,
                labelKey: "admin_sidebar_purchasing",
                href: "/branch/purchasing",
                requiredPermission: "purchases",
              },
              {
                icon: CircleDollarSign,
                labelKey: "admin_sidebar_finance",
                href: "/branch/finance",
                requiredPermission: "reports",
              },
              {
                icon: BadgePercent,
                labelKey: "admin_sidebar_promotions",
                href: "/branch/promotions",
                requiredPermission: "promotions",
              },
            ],
          },
          {
            headingKey: "nav_group_settings",
            items: [
              {
                icon: UserCog,
                labelKey: "admin_sidebar_staff",
                href: "/branch/staff",
                requiredPermission: "employees",
              },
              {
                icon: User,
                labelKey: "admin_sidebar_profile",
                href: "/branch/profile",
              },
            ],
          },
        ];

  const NavItem = ({
    icon: IconComponent,
    labelKey,
    href,
    exact = false,
    isUtility = false,
  }: NavItemProps) => {
    const fullHref = href.startsWith("/branch")
      ? buildBranchPath(locale, branchId, href.replace(/^\/branch\/?/, ""))
      : `/${locale}${href}`;
    const isActive = exact
      ? pathname === fullHref
      : pathname.startsWith(fullHref);

    return (
      <Link
        href={fullHref}
        onClick={() => {
          if (isOpen && window.innerWidth < 1024) setIsOpen(false);
        }}
        className={cn(
          "group flex min-h-11 w-full items-center rounded-2xl px-3 py-2.5 text-sm transition-colors duration-150 ease-in-out",
          isActive
            ? "bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20"
            : "text-[#8B6E5A] hover:bg-[#AB6E3C]/10 hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#AB6E3C]/15 dark:hover:text-[#F7F1E9]",
          isUtility ? "font-normal" : "font-medium",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <IconComponent
          className={cn(
            "mr-3 h-5 w-5",
            isActive
              ? "text-current"
              : "text-[#AB6E3C]/55 group-hover:text-[#AB6E3C]",
          )}
        />
        <span>{t(labelKey)}</span>
      </Link>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-[#AB6E3C]/10 bg-[#FAF3EA]/95 transition-transform duration-300 ease-in-out dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/95 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#AB6E3C]/10 px-4 dark:border-[#AB6E3C]/15">
          <Link
            href={buildBranchPath(locale, branchId)}
            className="flex min-w-0 items-center"
            onClick={() => setIsOpen(false)}
          >
            {restaurantSettings.logoUrl ? (
              <Image
                src={restaurantSettings.logoUrl}
                alt={`${restaurantSettings.name} Logo`}
                width={32}
                height={32}
                className="mr-2 h-9 w-9 rounded-full bg-[#FEFAF6] object-contain p-0.5 shadow-sm dark:bg-[#251810]"
              />
            ) : (
              <div className="mr-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#AB6E3C] text-base font-bold text-white shadow-sm shadow-[#AB6E3C]/25">
                {restaurantSettings.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="truncate text-base font-semibold text-[#2E2117] dark:text-[#F7F1E9]"
              title={restaurantSettings.name}
            >
              {restaurantSettings.name || t("default_restaurant_name")}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-10 w-10 rounded-full text-[#8B6E5A] hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#251810] dark:hover:text-[#AB6E3C] lg:hidden"
            aria-label={t("sidebar_close_aria_label")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-grow space-y-1.5 overflow-y-auto p-3">
          {navSections
            .map((section) => ({
              ...section,
              items: section.items.filter(canAccessItem),
            }))
            .filter((section) => section.items.length > 0)
            .map((section, sectionIndex, sections) => (
              <div
                key={section.headingKey}
                className={cn(sectionIndex > 0 && "pt-3")}
              >
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6E5A]/75 dark:text-[#B89078]/75">
                  {t(section.headingKey)}
                </p>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.href}
                      {...item}
                      isUtility={section.headingKey === "nav_group_settings"}
                    />
                  ))}
                </div>
                {sectionIndex < sections.length - 1 && (
                  <hr className="my-3 border-[#AB6E3C]/10 dark:border-[#AB6E3C]/15" />
                )}
              </div>
            ))}
        </nav>
      </aside>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
