'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  CircleDollarSign,
  ChevronLeft,
  LogOut,
  LayoutGrid,
  Menu,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
  requiredAccess?: keyof ControlShellProps['accessControls'];
}

const CONTROL_NAV_ITEMS: ControlNavItem[] = [
  {
    href: '/control/overview',
    icon: LayoutGrid,
    labelKey: 'nav.overview',
  },
  {
    href: '/control/restaurants',
    icon: Building2,
    labelKey: 'nav.restaurants',
    requiredAccess: 'restaurants',
  },
  {
    href: '/control/people',
    icon: ShieldCheck,
    labelKey: 'nav.people',
    requiredAccess: 'people',
  },
  {
    href: '/control/finance',
    icon: CircleDollarSign,
    labelKey: 'nav.finance',
    requiredAccess: 'finance',
  },
  {
    href: '/control/settings',
    icon: Settings,
    labelKey: 'nav.settings',
    requiredAccess: 'settings',
  },
];

const SIDEBAR_STORAGE_KEY = 'owner-control-sidebar-open';

export function ControlShell({
  children,
  locale,
  organizationName,
  userEmail,
  accessControls,
}: ControlShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('owner.control');
  const tDashboard = useTranslations('owner.dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = CONTROL_NAV_ITEMS.filter(
    ({ requiredAccess }) => !requiredAccess || accessControls[requiredAccess]
  );

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedValue === 'false') {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#2E2117] [background:radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(54,176,128,0.08)_0%,transparent_60%),linear-gradient(160deg,#FAF3EA_0%,#F5EAD8_50%,#EFE0CA_100%)] dark:bg-[#170F0C] dark:text-[#F7F1E9] dark:[background:radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(54,176,128,0.08)_0%,transparent_60%),linear-gradient(160deg,#170F0C_0%,#1E1209_50%,#251810_100%)]">
      <button
        type="button"
        onClick={() => setSidebarOpen((current) => !current)}
        className={cn(
          'fixed top-5 z-50 hidden h-11 w-11 items-center justify-center rounded-full border border-[#AB6E3C]/20 bg-[#FEFAF6]/85 text-[#8B6E5A] shadow-sm transition-all hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:border-[#AB6E3C]/25 dark:bg-[#251810]/85 dark:text-[#B89078] dark:hover:bg-[#2B1A10] dark:hover:text-[#AB6E3C] lg:flex',
          sidebarOpen ? 'left-[244px]' : 'left-4'
        )}
        aria-label={sidebarOpen ? 'Hide navigation' : 'Show navigation'}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-[288px] shrink-0 border-r border-[#AB6E3C]/10 bg-[#FAF3EA]/95 transition-transform duration-300 dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/95 lg:flex lg:flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-screen flex-col px-5 py-5">
          <div className="rounded-[28px] border border-[#AB6E3C]/10 bg-[#FEFAF6] p-5 shadow-sm shadow-[#AB6E3C]/5 dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#AB6E3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6E5A] dark:text-[#B89078]">
                <Building2 className="h-3.5 w-3.5" />
                {t('eyebrow')}
              </div>
              <h1 className="text-lg font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
                {organizationName}
              </h1>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map(({ href, icon: Icon, labelKey }) => {
              const fullHref = `/${locale}${href}`;
              const isActive = pathname.startsWith(fullHref);

              return (
                <Link
                  key={href}
                  href={fullHref}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/20'
                      : 'text-[#8B6E5A] hover:bg-[#AB6E3C]/10 hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#AB6E3C]/15 dark:hover:text-[#F7F1E9]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[28px] border border-[#AB6E3C]/10 bg-[#FEFAF6] p-4 shadow-sm shadow-[#AB6E3C]/5 dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#AB6E3C]/10">
                <User className="h-4 w-4 text-[#AB6E3C]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#2E2117] dark:text-[#F7F1E9]">
                  {userEmail}
                </p>
                <p className="text-xs text-[#8B6E5A] dark:text-[#B89078]">
                  {tDashboard('user_menu.my_account_label')}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                href={`/${locale}/control/profile`}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#AB6E3C]/15 px-3 py-2 text-sm font-medium text-[#8B6E5A] transition-colors hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#2B1A10]"
              >
                <User className="h-4 w-4" />
                <span>{tDashboard('user_menu.profile_link')}</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="flex min-h-11 w-full items-center justify-start gap-2 rounded-2xl px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>{tDashboard('user_menu.logout_button')}</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'min-w-0 flex-1 transition-[padding] duration-300',
          sidebarOpen ? 'lg:pl-[288px]' : 'lg:pl-0'
        )}
      >
        <main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#AB6E3C]/15 bg-[#FEFAF6]/85 px-3 py-2 text-xs font-medium text-[#8B6E5A] shadow-sm dark:bg-[#251810]/85 dark:text-[#B89078]">
              <Building2 className="h-3.5 w-3.5 text-[#AB6E3C]" />
              {organizationName}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full border-[#AB6E3C]/15 bg-[#FEFAF6]/85 text-[#8B6E5A] shadow-sm hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:bg-[#251810]/85 dark:text-[#B89078]"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">
                    {tDashboard('user_menu.my_account_label')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{tDashboard('user_menu.my_account_label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href={`/${locale}/control/profile`} passHref legacyBehavior>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a>
                      <User className="mr-2 h-4 w-4" />
                      {tDashboard('user_menu.profile_link')}
                    </a>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-900/50 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {tDashboard('user_menu.logout_button')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#AB6E3C]/10 bg-[#FAF3EA]/95 backdrop-blur dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/95 lg:hidden">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {navItems.map(({ href, icon: Icon, labelKey }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);

            return (
              <li key={href}>
                <Link
                  href={fullHref}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium',
                    isActive
                      ? 'text-[#2E2117] dark:text-[#F7F1E9]'
                      : 'text-[#8B6E5A] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:text-[#F7F1E9]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-[#AB6E3C] text-white' : 'bg-[#AB6E3C]/10 text-[#AB6E3C] dark:bg-[#AB6E3C]/15'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-center leading-tight">
                    {t(labelKey)}
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
