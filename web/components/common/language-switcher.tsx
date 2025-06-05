'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localeDetails } from '@/config/i18n.config';

export function LanguageSwitcher({ preserveQuery = true }: { preserveQuery?: boolean }) {
  const router = useRouter();
  const currentPathname = usePathname();
  //const currentParams = useParams();
  const currentLocale = useLocale();
  const t = useTranslations('Common');

  const switchLocale = (newLocale: string) => {
    // Remove current locale from pathname
    let newPathname = currentPathname;
    if (currentPathname.startsWith(`/${currentLocale}`)) {
      newPathname = currentPathname.substring(`/${currentLocale}`.length) || '/';
    }
    
    // Preserve search params if preserveQuery is true
    const search = preserveQuery && typeof window !== 'undefined' ? window.location.search : '';
    router.push(`/${newLocale}${newPathname}${search}`);
    router.refresh(); // Recommended by Next.js docs for locale changes
  };

  const selectedLocaleDetail = localeDetails.find(l => l.code === currentLocale) || localeDetails[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center px-2 sm:px-3" aria-label={t('language_switcher.toggle_label')}>
          <span className="mr-1 sm:mr-2 text-lg">{selectedLocaleDetail.flag}</span>
          <span className="hidden sm:inline text-sm">{selectedLocaleDetail.name}</span>
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {localeDetails.map(localeDetail => (
          <DropdownMenuItem
            key={localeDetail.code}
            onClick={() => switchLocale(localeDetail.code)}
            className="cursor-pointer"
            disabled={currentLocale === localeDetail.code}
          >
            <span className="mr-2 text-lg">{localeDetail.flag}</span> {localeDetail.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}