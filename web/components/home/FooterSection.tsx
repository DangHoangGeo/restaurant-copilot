"use client";
import React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export const FooterSection = () => {
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-[#f1dcc4]/10 bg-[#080705] px-5 py-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-[#b8a58e] sm:flex-row">
        <span>
          © {year} coorder<span className="text-[#d18a4e]">.ai</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/discover`} className="transition-colors hover:text-[#fff7e9]">
            Discover
          </Link>
          <span>·</span>
          <Link href={`/${locale}/privacy`} className="transition-colors hover:text-[#fff7e9]">
            Privacy
          </Link>
          <span>·</span>
          <Link href={`/${locale}/terms`} className="transition-colors hover:text-[#fff7e9]">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
};
