"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageSwitcherLanding } from "./LanguageSwitcherLanding";
import Link from "next/link";
import { Compass } from "lucide-react";

interface LandingPageHeaderProps {
  locale: string;
}

export const LandingPageHeader = ({ locale }: LandingPageHeaderProps) => {
  const t = useTranslations("landing");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#f1dcc4]/10 bg-[#080705]/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <Image
            src="/brand/coorder-wordmark.svg"
            alt="CoOrder.ai"
            width={159}
            height={36}
            priority
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`/${locale}/discover`}
            className="hidden h-9 items-center gap-2 rounded-lg border border-[#f1dcc4]/12 px-3 text-sm font-medium text-[#dbc7ad] transition-colors hover:bg-[#fff7e9]/8 hover:text-[#fff7e9] sm:inline-flex"
          >
            <Compass className="h-4 w-4" />
            {t("header.discover")}
          </Link>
          <LanguageSwitcherLanding />
          <Link
            href={`/${locale}/login`}
            className="text-sm font-medium text-[#dbc7ad] transition-colors hover:text-[#fff7e9]"
          >
            {t("header.login")}
          </Link>
        </nav>
      </div>
    </header>
  );
};
