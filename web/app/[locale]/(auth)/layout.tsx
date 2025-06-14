"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Moon, Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTheme } from "next-themes";

interface AuthPageLayoutProps {
  children: ReactNode;
}

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("Common");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { theme, setTheme } = useTheme();

  const socialLinks = [
    { name: "GitHub", icon: Github, href: "#github" },
    { name: "Twitter", icon: Twitter, href: "#twitter" },
    { name: "LinkedIn", icon: Linkedin, href: "#linkedin" },
    { name: "Email", icon: Mail, href: "#email" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 dark:border-slate-700/50">
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

            {/* Navigation */}
            <div className="flex items-center space-x-3">
              <LanguageSwitcher
                currentLocale={locale}
                onLocaleChange={(newLocale) => {
                  // Navigate to same page in new locale
                  const currentPath = window.location.pathname.split('/').slice(2).join('/');
                  if (typeof window !== 'undefined') {
                    window.location.href = `/${newLocale}/${currentPath}`;
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                aria-label={tCommon('theme.toggle_aria_label') || 'Toggle theme'}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Link href={`/${locale}`}>
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
                  {tCommon('back_to_home') || 'Home'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src="/coorder-ai.png"
                alt="CoOrder.ai"
                width={24}
                height={24}
                className="w-6 h-6 mr-2"
              />
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                coorder<span className="text-blue-600 dark:text-blue-400">.ai</span>
              </span>
            </Link>

            {/* Description */}
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
              {t('footer.description') || 'Revolutionizing restaurant operations with AI-powered order management and customer experiences.'}
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150"
                  aria-label={social.name}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>

            {/* Copyright */}
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs text-slate-500 dark:text-slate-400">
              <p>© {new Date().getFullYear()} Coorder.ai. {t('footer.rights') || 'All rights reserved.'}</p>
              <div className="flex space-x-4">
                <Link href={`/${locale}/privacy`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {t('footer.privacy') || 'Privacy Policy'}
                </Link>
                <Link href={`/${locale}/terms`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {t('footer.terms') || 'Terms of Service'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}