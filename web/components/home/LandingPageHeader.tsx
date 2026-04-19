"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageSwitcherLanding } from "./LanguageSwitcherLanding";
import Link from "next/link";

interface LandingPageHeaderProps {
  locale: string;
}

export const LandingPageHeader = ({ locale }: LandingPageHeaderProps) => {
  const t = useTranslations("landing");

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center bg-[#FAF3EA]/80 dark:bg-[#170F0C]/80 backdrop-blur-md border-b border-[#AB6E3C]/10 dark:border-[#AB6E3C]/15">
      <div className="w-full max-w-5xl mx-auto px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <Image
            src="/coorder-ai.png"
            alt="CoOrder.ai"
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span
            className="text-base font-medium text-[#2E2117] dark:text-[#F7F1E9]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <LanguageSwitcherLanding />
          <Link
            href={`/${locale}/login`}
            className="text-sm font-medium text-[#8B6E5A] dark:text-[#B89078] hover:text-[#AB6E3C] dark:hover:text-[#AB6E3C] transition-colors"
          >
            {t("header.login")}
          </Link>
        </div>
      </div>
    </header>
  );
};
