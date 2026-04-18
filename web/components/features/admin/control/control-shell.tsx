'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  CircleDollarSign,
  LogOut,
  LayoutGrid,
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

  const navItems = CONTROL_NAV_ITEMS.filter(
    ({ requiredAccess }) => !requiredAccess || accessControls[requiredAccess]
  );

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold">{organizationName}</span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1">
              {navItems.map(({ href, icon: Icon, labelKey }) => {
                const fullHref = `/${locale}${href}`;
                const isActive = pathname.startsWith(fullHref);

                return (
                  <Link
                    key={href}
                    href={fullHref}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(labelKey)}</span>
                  </Link>
                );
              })}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 rounded-xl px-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="max-w-40 truncate text-sm">{userEmail}</span>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
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
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-foreground text-background' : 'bg-muted'
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
