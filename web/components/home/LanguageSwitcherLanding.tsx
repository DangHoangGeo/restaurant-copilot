"use client";
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Check, ChevronDown, Languages } from 'lucide-react';

export const LanguageSwitcherLanding = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const locales = [
    { code: 'en', name: 'English', shortName: 'EN' },
    { code: 'ja', name: '日本語', shortName: 'JA' },
    { code: 'vi', name: 'Tiếng Việt', shortName: 'VI' }
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocaleCode, setSelectedLocaleCode] = useState(currentLocale);

  const switchLocale = (localeCode: string) => {
    setSelectedLocaleCode(localeCode);
    const segments = pathname.split('/');
    segments[1] = localeCode;
    router.push(segments.join('/') || `/${localeCode}`);
    setIsOpen(false);
  };
  
  const selectedLocale = locales.find(l => l.code === selectedLocaleCode) || locales[0];

  // Update selected locale when current locale changes (e.g., from URL changes)
  useEffect(() => {
    setSelectedLocaleCode(currentLocale);
  }, [currentLocale]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#f1dcc4]/15 bg-[#fff7e9]/6 px-3 text-sm font-medium text-[#dbc7ad] shadow-[inset_0_1px_0_rgba(255,247,233,0.08)] transition duration-200 hover:border-[#e9a35e]/35 hover:bg-[#fff7e9]/10 hover:text-[#fff7e9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e9a35e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14100b] active:translate-y-px"
      >
        <Languages className="h-4 w-4 text-[#e9a35e]" aria-hidden="true" />
        <span className="rounded-md bg-[#c8773e]/16 px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-[#f6e8d3]">
          {selectedLocale.shortName}
        </span>
        <span className="hidden sm:inline">{selectedLocale.name}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#c9b7a0] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-[#f1dcc4]/15 bg-[#14100b]/95 p-1 text-[#f6e8d3] shadow-[0_22px_54px_-28px_rgba(8,7,5,0.95)] backdrop-blur-xl"
        >
          {locales.map(locale => ( 
            <button 
              key={locale.code} 
              onClick={() => switchLocale(locale.code)} 
              className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors duration-150 ${
                locale.code === selectedLocaleCode 
                  ? 'bg-[#c8773e]/18 text-[#fff7e9]'
                  : 'text-[#c9b7a0] hover:bg-[#fff7e9]/8 hover:text-[#fff7e9]'
              }`} 
              role="menuitem"
            > 
              <span className="w-7 rounded-md border border-[#f1dcc4]/12 bg-[#fff7e9]/6 px-1.5 py-0.5 text-center text-[11px] font-semibold tracking-[0.12em] text-[#e9a35e]">
                {locale.shortName}
              </span>
              <span>{locale.name}</span>
              {locale.code === selectedLocaleCode && (
                <Check className="ml-auto h-4 w-4 text-[#97be73]" aria-hidden="true" />
              )}
            </button> 
          ))}
        </div>
      )}
    </div>
  );
};
