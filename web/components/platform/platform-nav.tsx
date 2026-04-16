'use client';

// Platform Admin Navigation Component

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  CheckCircle2,
  CreditCard,
  Users,
  BarChart3,
  FileText,
  MessageSquare,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href: string;
}

export default function PlatformNav({ locale }: { locale: string }) {
  const t = useTranslations('platform.nav');
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      labelKey: 'overview',
      href: `/${locale}/platform`
    },
    {
      icon: CheckCircle2,
      labelKey: 'approvals',
      href: `/${locale}/platform/approvals`
    },
    {
      icon: CreditCard,
      labelKey: 'subscriptions',
      href: `/${locale}/platform/subscriptions`
    },
    {
      icon: Users,
      labelKey: 'accounts',
      href: `/${locale}/platform/accounts`
    },
    {
      icon: BarChart3,
      labelKey: 'usage',
      href: `/${locale}/platform/usage`
    },
    {
      icon: FileText,
      labelKey: 'logs',
      href: `/${locale}/platform/logs`
    },
    {
      icon: MessageSquare,
      labelKey: 'support',
      href: `/${locale}/platform/support`
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-blue-700' : 'text-gray-500')} />
              {t(item.labelKey)}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Settings */}
        <Link
          href={`/${locale}/platform/settings`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
            pathname === `/${locale}/platform/settings`
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <Settings className={cn('w-5 h-5', pathname === `/${locale}/platform/settings` ? 'text-blue-700' : 'text-gray-500')} />
          {t('settings')}
        </Link>
      </nav>
    </aside>
  );
}
