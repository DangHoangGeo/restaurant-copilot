'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { localeDetails } from '@/config/i18n.config';

interface LanguageSwitcherProps {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  preserveQuery?: boolean;
}

export function LanguageSwitcher({ currentLocale, onLocaleChange, preserveQuery = true }: LanguageSwitcherProps) {
  const router = useRouter();
  const currentPathname = usePathname();
  const t = useTranslations('common');

  const switchLocale = (newLocale: string) => {
    const segments = currentPathname.split('/').filter(Boolean);
    const pathWithoutLocale = segments.length > 0 && localeDetails.some(l => l.code === segments[0])
      ? '/' + segments.slice(1).join('/')
      : currentPathname;
    const search = preserveQuery && typeof window !== 'undefined' ? window.location.search : '';
    
    // Update the parent component's state
    onLocaleChange(newLocale);
    
    // Navigate to the new locale
    router.push(`/${newLocale}${pathWithoutLocale}${search}`);
    router.refresh();
  };

  const selectedLocaleDetail = localeDetails.find(l => l.code === currentLocale) || localeDetails[0];
  
  // Reorder locales to put current locale at the top
  const orderedLocales = [
    ...localeDetails.filter(l => l.code === currentLocale),
    ...localeDetails.filter(l => l.code !== currentLocale)
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center px-2 sm:px-3" aria-label={t('language_switcher.toggle_label')}>
          <span className="mr-1 sm:mr-2 text-lg">{selectedLocaleDetail.flag}</span>
          <span className="hidden sm:inline text-sm">{selectedLocaleDetail.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {orderedLocales.map(localeDetail => (
          <DropdownMenuItem
            key={localeDetail.code}
            onClick={() => switchLocale(localeDetail.code)}
            className="cursor-pointer"
            disabled={localeDetail.code === currentLocale}
          >
            <span className="mr-2 text-lg">{localeDetail.flag}</span> {localeDetail.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}