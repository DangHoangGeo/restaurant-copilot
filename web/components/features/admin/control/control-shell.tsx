"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { ComponentType, ReactNode } from "react";
import {
  Building2,
  CircleDollarSign,
  Globe2,
  Home,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UtensilsCrossed,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { localeDetails } from "@/config/i18n.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ControlShellProps {
  children: ReactNode;
  locale: string;
  organizationName: string;
  userEmail: string;
  accessControls: {
    restaurants: boolean;
    people: boolean;
    finance: boolean;
    settings: boolean;
  };
}

interface ControlNavItem {
  href: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  requiredAccess?: keyof ControlShellProps["accessControls"];
}

const CONTROL_NAV_ITEMS: ControlNavItem[] = [
  {
    href: "/control/overview",
    icon: Home,
    labelKey: "nav.home",
  },
  {
    href: "/control/restaurants",
    icon: Building2,
    labelKey: "nav.restaurants",
    requiredAccess: "restaurants",
  },
  {
    href: "/control/menu",
    icon: UtensilsCrossed,
    labelKey: "nav.menu",
    requiredAccess: "restaurants",
  },
  {
    href: "/control/people",
    icon: ShieldCheck,
    labelKey: "nav.people",
    requiredAccess: "people",
  },
  {
    href: "/control/finance",
    icon: CircleDollarSign,
    labelKey: "nav.finance",
    requiredAccess: "finance",
  },
  {
    href: "/control/settings",
    icon: Settings,
    labelKey: "nav.settings",
    requiredAccess: "settings",
  },
];

export function ControlShell({
  children,
  locale,
  organizationName,
  userEmail,
  accessControls,
}: ControlShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("owner.control");
  const tDashboard = useTranslations("owner.dashboard");

  const navItems = CONTROL_NAV_ITEMS.filter(
    ({ requiredAccess }) => !requiredAccess || accessControls[requiredAccess],
  );
  const mobileNavItems = navItems.filter(
    (item) => item.href !== "/control/settings",
  );

  const isNavItemActive = (href: string) =>
    href === "/control/overview"
      ? pathname === `/${locale}${href}` || pathname === `/${locale}/control`
      : pathname.startsWith(`/${locale}${href}`);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  const switchLocale = (nextLocale: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const pathWithoutLocale =
      segments.length > 0 &&
      localeDetails.some((localeDetail) => localeDetail.code === segments[0])
        ? `/${segments.slice(1).join("/")}`
        : pathname;
    const search = typeof window !== "undefined" ? window.location.search : "";

    router.push(`/${nextLocale}${pathWithoutLocale}${search}`);
    router.refresh();
  };

  const currentLocaleLabel =
    localeDetails.find((localeDetail) => localeDetail.code === locale)?.name ??
    locale.toUpperCase();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  const renderAccountMenu = (className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 rounded-md border-[#f1dcc4]/12 bg-[#fff7e9]/8 text-[#dbc7ad] hover:bg-[#fff7e9]/12 hover:text-[#fff7e9]",
            className,
          )}
        >
          <User className="h-4 w-4" />
          <span className="sr-only">
            {tDashboard("user_menu.my_account_label")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-lg border-[#f1dcc4]/12 bg-[#120d08]/95 text-[#efe0ca] shadow-2xl shadow-black/35 backdrop-blur-xl"
      >
        <DropdownMenuLabel>
          <span className="block truncate text-sm">{organizationName}</span>
          <span className="block truncate text-xs font-normal text-[#b89078]">
            {userEmail}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#f1dcc4]/10" />
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b89078]">
          {t("preferences.label")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme(nextTheme)}
          className="cursor-pointer focus:bg-[#fff7e9]/10 focus:text-[#fff7e9]"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {nextTheme === "dark"
            ? t("preferences.darkMode")
            : t("preferences.lightMode")}
        </DropdownMenuItem>
        {localeDetails.map((localeDetail) => (
          <DropdownMenuItem
            key={localeDetail.code}
            onClick={() => switchLocale(localeDetail.code)}
            className="cursor-pointer focus:bg-[#fff7e9]/10 focus:text-[#fff7e9]"
            disabled={localeDetail.code === locale}
          >
            <Globe2 className="mr-2 h-4 w-4" />
            {localeDetail.code === locale
              ? t("preferences.languageSelected", {
                  language: currentLocaleLabel,
                })
              : localeDetail.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-[#f1dcc4]/10" />
        <DropdownMenuItem
          asChild
          className="cursor-pointer focus:bg-[#fff7e9]/10 focus:text-[#fff7e9]"
        >
          <Link href={`/${locale}/control/profile`}>
            <User className="mr-2 h-4 w-4" />
            {tDashboard("user_menu.profile_link")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#f1dcc4]/10" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {tDashboard("user_menu.logout_button")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="admin-route-surface min-h-screen bg-[#080705] text-[#fff7e9]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(200,119,62,0.2),transparent_32%),radial-gradient(circle_at_86%_4%,rgba(151,190,115,0.13),transparent_30%),linear-gradient(180deg,#080705_0%,#15100b_46%,#080705_100%)]" />

      <header className="sticky top-0 z-40 border-b border-[#f1dcc4]/10 bg-[#080705]/88 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center gap-3 px-4">
          <Link href={`/${locale}/control/overview`} className="shrink-0">
            <Image
              src="/brand/coorder-wordmark.svg"
              alt="CoOrder"
              width={132}
              height={30}
              priority
            />
          </Link>
          <div className="ml-auto">{renderAccountMenu()}</div>
        </div>
      </header>

      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-[#f1dcc4]/10 bg-[#080705]/76 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
          <Link href={`/${locale}/control/overview`} className="mb-6 block">
            <Image
              src="/brand/coorder-wordmark.svg"
              alt="CoOrder"
              width={142}
              height={32}
              priority
            />
          </Link>

          <div className="mb-5 rounded-lg bg-[#fff7e9]/7 px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#fff7e9]">
              <Building2 className="h-4 w-4 shrink-0 text-[#e9a35e]" />
              <span className="truncate">{organizationName}</span>
            </div>
            <p className="mt-1 truncate text-xs text-[#b89078]">{userEmail}</p>
          </div>

          <nav
            className="space-y-1"
            aria-label={t("preferences.navigationLabel")}
          >
            {navItems.map((item) => (
              <SidebarNavLink
                key={item.href}
                href={`/${locale}${item.href}`}
                active={isNavItemActive(item.href)}
                icon={item.icon}
                label={t(item.labelKey)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-5">{renderAccountMenu("w-full")}</div>
        </aside>

        <main className="w-full px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#fff7e9]/8 px-3 py-2 text-sm text-[#dbc7ad] shadow-sm shadow-black/10 backdrop-blur-xl md:hidden">
            <Building2 className="h-4 w-4 shrink-0 text-[#e9a35e]" />
            <span className="truncate">{organizationName}</span>
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f1dcc4]/10 bg-[#080705]/92 backdrop-blur-xl lg:hidden">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(mobileNavItems.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {mobileNavItems.map((item) => {
            const active = isNavItemActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={`/${locale}${item.href}`}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium",
                    active
                      ? "text-[#fff7e9]"
                      : "text-[#c9b7a0] hover:text-[#fff7e9]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <MobileNavIcon active={active} icon={item.icon} />
                  <span className="text-center leading-tight">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SidebarNavLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-[#c8773e] text-white shadow-[0_14px_34px_-22px_rgba(200,119,62,0.9)]"
          : "text-[#dbc7ad] hover:bg-[#fff7e9]/9 hover:text-[#fff7e9]",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MobileNavIcon({
  active,
  icon: Icon,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md",
        active ? "bg-[#c8773e] text-white" : "bg-[#fff7e9]/8 text-[#e9a35e]",
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}
