'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  labelMode?: 'name' | 'code';
  showFlag?: boolean;
  triggerMode?: 'label' | 'flag';
}

function LocaleFlagIcon({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const baseClassName = cn(
    "relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(31,26,20,0.16)]",
    className,
  );

  if (code === 'ja') {
    return (
      <span className={baseClassName} aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#BC002D]" />
      </span>
    );
  }

  if (code === 'vi') {
    return (
      <span className={cn(baseClassName, "bg-[#DA251D]")} aria-hidden="true">
        <span
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#FFCD00]"
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 35%)",
          }}
        />
      </span>
    );
  }

  return (
    <span className={baseClassName} aria-hidden="true">
      <span
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom,#B22234 0 7.69%,#FFFFFF 7.69% 15.38%)",
        }}
      />
      <span className="absolute left-0 top-0 h-[54%] w-[56%] bg-[#3C3B6E]" />
    </span>
  );
}

export function LanguageSwitcher({
  currentLocale,
  onLocaleChange,
  preserveQuery = true,
  labelMode = 'name',
  showFlag = true,
  triggerMode = 'label',
}: LanguageSwitcherProps) {
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
  const selectedLabel = labelMode === 'code'
    ? selectedLocaleDetail.code.toUpperCase()
    : selectedLocaleDetail.name;
  
  // Reorder locales to put current locale at the top
  const orderedLocales = [
    ...localeDetails.filter(l => l.code === currentLocale),
    ...localeDetails.filter(l => l.code !== currentLocale)
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center px-2 sm:px-3",
            triggerMode === 'flag' && "justify-center px-0 sm:px-0",
          )}
          aria-label={t('language_switcher.toggle_label')}
        >
          {showFlag && (
            <LocaleFlagIcon
              code={selectedLocaleDetail.code}
              className={triggerMode === 'flag' ? "h-5 w-5" : "mr-1 sm:mr-2"}
            />
          )}
          {triggerMode === 'label' ? (
            <span className="text-sm">{selectedLabel}</span>
          ) : null}
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
            {showFlag && (
              <LocaleFlagIcon code={localeDetail.code} className="mr-2 h-5 w-5" />
            )}
            {localeDetail.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
