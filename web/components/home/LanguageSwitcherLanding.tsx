"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const LanguageSwitcherLanding = () => {
  const router = useRouter();
  const currentLocale = useLocale();
  const locales = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocaleCode, setSelectedLocaleCode] = useState(currentLocale);

  const switchLocale = (localeCode: string) => {
    setSelectedLocaleCode(localeCode);
    router.push(`/${localeCode}`);
    setIsOpen(false);
  };
  
  const selectedLocale = locales.find(l => l.code === selectedLocaleCode) || locales[0];

  // Update selected locale when current locale changes (e.g., from URL changes)
  useEffect(() => {
    setSelectedLocaleCode(currentLocale);
  }, [currentLocale]);

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center !shadow-none" 
        iconRight={ChevronRight}
        href="#"
      >
        <span className="mr-1 sm:mr-2">{selectedLocale.flag}</span>
        <span className="hidden sm:inline">{selectedLocale.name}</span>
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-700 rounded-xl shadow-lg py-1 z-50">
          {locales.map(locale => ( 
            <button 
              key={locale.code} 
              onClick={() => switchLocale(locale.code)} 
              className={`w-full text-left flex items-center px-4 py-2 text-sm transition-colors duration-150 ${
                locale.code === selectedLocaleCode 
                  ? 'bg-[--brand-color-landing]/10 text-[--brand-color-landing] font-medium' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`} 
              role="menuitem"
            > 
              <span className="mr-2">{locale.flag}</span> 
              {locale.name}
              {locale.code === selectedLocaleCode && (
                <span className="ml-auto text-[--brand-color-landing]">✓</span>
              )}
            </button> 
          ))}
        </div>
      )}
    </div>
  );
};
