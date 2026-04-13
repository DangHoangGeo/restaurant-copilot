"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Home,
  Settings,
  ClipboardList,
  TableIcon as TableSimpleIcon,
  UserCog,
  BarChartBig,
  Eye,
  X,
  BookUser,
  List,
  LucideIcon,
  Sparkles,
  Building2,
  Layers,
  ShoppingCart,
  FileText,
  Tag,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  restaurantSettings: {
    name: string;
    logoUrl: string | null;
    subdomain?: string;
  };
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavItemConfig {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
  featureFlag?: boolean;
}

interface NavItemProps {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
  isUtility?: boolean;
}

const utilityNavItemsConfig: NavItemConfig[] = [
  {
    icon: Layers,
    labelKey: "admin_sidebar_branches",
    href: "/dashboard/branches",
  },
  {
    icon: Building2,
    labelKey: "admin_sidebar_organization",
    href: "/dashboard/organization",
  },
  {
    icon: Settings,
    labelKey: "admin_sidebar_restaurant_settings",
    href: "/dashboard/settings",
  },
  {
    icon: Eye,
    labelKey: "admin_sidebar_homepage_management",
    href: "/dashboard/homepage",
  },
];

export function AdminSidebar({
  restaurantSettings,
  isOpen,
  setIsOpen,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations("owner.dashboard");
  const locale = (params.locale as string) || "en";
  const { needsOnboarding } = useRestaurantSettings();

  // Dynamic navigation items based on onboarding status
  const getNavItemsConfig = (): NavItemConfig[] => {
    const baseItems: NavItemConfig[] = [
      {
        icon: Home,
        labelKey: "admin_sidebar_dashboard",
        href: "/dashboard",
        exact: true,
      },
    ];

    // Show onboarding if not yet onboarded and feature is enabled
    if (needsOnboarding && FEATURE_FLAGS.onboarding) {
      baseItems.push({
        icon: Sparkles,
        labelKey: "admin_sidebar_onboarding",
        href: "/dashboard/onboarding",
      });
    } else {
      // Show regular navigation items only after onboarding
      baseItems.push(
        {
          icon: ClipboardList,
          labelKey: "admin_sidebar_menu_management",
          href: "/dashboard/menu",
        },
        { icon: List, labelKey: "admin_sidebar_orders",
          href: "/dashboard/orders" },
        {
          icon: TableSimpleIcon,
          labelKey: "admin_sidebar_table_qr_management",
          href: "/dashboard/tables",
        },
        {
          icon: UserCog,
          labelKey: "admin_sidebar_employees_schedules",
          href: "/dashboard/employees",
        },
        {
          icon: BookUser,
          labelKey: "admin_sidebar_bookings_preorders",
          href: "/dashboard/bookings",
          featureFlag: FEATURE_FLAGS.tableBooking,
        },
        {
          icon: BarChartBig,
          labelKey: "admin_sidebar_reports_analytics",
          href: "/dashboard/reports",
        },
        {
          icon: ShoppingCart,
          labelKey: "admin_sidebar_purchasing",
          href: "/dashboard/purchasing",
        },
        {
          icon: FileText,
          labelKey: "admin_sidebar_finance",
          href: "/dashboard/finance",
        },
        {
          icon: Tag,
          labelKey: "admin_sidebar_promotions",
          href: "/dashboard/promotions",
        }
      );
    }

    return baseItems;
  };

  const navItemsConfig = getNavItemsConfig();

  const NavItem = ({
    icon: IconComponent,
    labelKey,
    href,
    exact = false,
    isUtility = false,
  }: NavItemProps) => {
    const fullHref = `/${locale}${href}`;
    const isActive = exact
      ? pathname === fullHref
      : pathname.startsWith(fullHref);

    return (
      <Link href={fullHref} passHref legacyBehavior>
        <a
          onClick={() => {
            if (isOpen && window.innerWidth < 1024) setIsOpen(false);
          }}
          className={cn(
            "flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-colors duration-150 ease-in-out group",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isUtility ? "font-normal" : "font-medium",
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <IconComponent
            className={cn(
              "mr-3 h-5 w-5",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span>{t(labelKey)}</span>
        </a>
      </Link>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col",
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0">
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center"
            onClick={() => setIsOpen(false)}
          >
            {restaurantSettings.logoUrl ? (
              <Image
                src={restaurantSettings.logoUrl}
                alt={`${restaurantSettings.name} Logo`}
                width={32}
                height={32}
                className="h-8 w-8 rounded-md mr-2 object-contain bg-muted p-0.5"
              />
            ) : (
              <div className="h-8 w-8 rounded-md mr-2 bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                {restaurantSettings.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="text-lg font-semibold text-foreground truncate"
              title={restaurantSettings.name}
            >
              {restaurantSettings.name || t("default_restaurant_name")}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
            aria-label={t("sidebar_close_aria_label")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-3 space-y-1.5 flex-grow overflow-y-auto">
          {navItemsConfig.map(
            (item) =>
              (item.featureFlag === undefined || item.featureFlag === true) && (
                <NavItem key={item.href} {...item} />
              ),
          )}

          {utilityNavItemsConfig.length > 0 && <hr className="my-3" />}
          {utilityNavItemsConfig.map(
            (item) =>
              (item.featureFlag === undefined || item.featureFlag === true) && (
                <NavItem key={item.href} {...item} isUtility />
              ),
          )}
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
