"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Menu as MenuIcon, Sun, Moon } from 'lucide-react';
import { Button } from './Button';
import { Icon } from './Icon';
import { LanguageSwitcherLanding } from './LanguageSwitcherLanding';
import { useThemeLanding } from './ThemeProvider';
import Link from 'next/link';

interface LandingPageHeaderProps {
  locale: string;
}

export const LandingPageHeader = ({ locale }: LandingPageHeaderProps) => {
  const { theme, toggleTheme } = useThemeLanding();
  const t = useTranslations('LandingPage');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center group">
              <div className="relative">
                <Image
                  src="/coorder-ai.png"
                  alt="CoOrder.ai"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg group-hover:bg-blue-500/30 transition-colors duration-200" />
              </div>
              <span className="ml-3 text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                coorder<span className="text-blue-600 dark:text-blue-400">.ai</span>
              </span>
            </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            <LanguageSwitcherLanding />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme} 
              className="!shadow-none" 
              aria-label={t('theme.toggle')}
              href="#"
            >
              <Icon name={theme === 'light' ? Moon : Sun} />
            </Button>
            <Button 
              href={`${locale}/login`} 
              variant="ghost" 
              size="sm" 
              className="!shadow-none outline"
            >
              {t('header.login')}
            </Button>
            <Button 
              href={`${locale}/signup`} 
              variant="primary" 
              size="sm"
            >
              {t('header.signup')}
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-2">
            <LanguageSwitcherLanding />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme} 
              className="!shadow-none !p-2" 
              aria-label={t('theme.toggle')}
              href="#"
            >
              <Icon name={theme === 'light' ? Moon : Sun} size={18} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="!shadow-none !p-2" 
              aria-label="Toggle menu"
              href="#"
            >
              <Icon name={MenuIcon} size={20} />
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="container mx-auto px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  href={`${locale}/login`} 
                  variant="ghost" 
                  size="sm" 
                  className="!shadow-none w-full outline" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('header.login')}
                </Button>
                <Button 
                  href={`${locale}/signup`} 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full"
                >
                  {t('header.signup')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
