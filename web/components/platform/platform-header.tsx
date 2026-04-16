'use client';

// Platform Admin Header Component

import { useTranslations } from 'next-intl';
import { Bell, User, LogOut, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function PlatformHeader({ locale }: { locale: string }) {
  const t = useTranslations('platform.header');

  const handleLogout = async () => {
    // TODO: Implement logout
    window.location.href = `/${locale}/auth/logout`;
  };

  const handleLocaleChange = (newLocale: string) => {
    // TODO: Implement locale switching
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`);
    window.location.href = newPath;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('title')}
          </h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {t('admin_badge')}
          </Badge>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications')}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-sm text-gray-500 text-center">
                {t('no_notifications')}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Locale Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('language')}>
                <Globe className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleLocaleChange('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLocaleChange('ja')}>
                日本語
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLocaleChange('vi')}>
                Tiếng Việt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('account')}>
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('account')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
