'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  ClipboardList,
  List,
  TableIcon as TableSimpleIcon,
  LucideIcon,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { useRestaurantSettings } from '@/contexts/RestaurantContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations('owner.dashboard');
  const locale = (params.locale as string) || 'en';
  const { needsOnboarding } = useRestaurantSettings();

  const navItems: NavItem[] = [];

  if (needsOnboarding && FEATURE_FLAGS.onboarding) {
    navItems.push({
      icon: Sparkles,
      labelKey: 'admin_sidebar_onboarding',
      href: '/dashboard/onboarding',
    });
  } else {
    navItems.push(
      { icon: Home, labelKey: 'admin_sidebar_dashboard', href: '/dashboard', exact: true },
      { icon: ClipboardList, labelKey: 'admin_sidebar_menu_management', href: '/dashboard/menu' },
      { icon: List, labelKey: 'admin_sidebar_orders', href: '/dashboard/orders' },
      { icon: TableSimpleIcon, labelKey: 'admin_sidebar_table_qr_management', href: '/dashboard/tables' },
    );
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card border-t lg:hidden"
      role="navigation"
      aria-label={t('bottom_nav_aria_label')}
    >
      <ul className="flex justify-around">
        {navItems.map(({ icon: Icon, labelKey, href, exact }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);
          return (
            <li key={href} className="flex-1">
              <Link
                href={fullHref}
                className={cn(
                  'flex flex-col items-center justify-center py-2 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="text-[10px] leading-tight">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

