"use client";
import React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export const FooterSection = () => {
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer
      className="py-8 px-5 border-t"
      style={{ background: "#EFE0CA", borderColor: "rgba(171,110,60,0.12)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#8B6E5A]">
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          © {year} coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/privacy`} className="hover:text-[#AB6E3C] transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link href={`/${locale}/terms`} className="hover:text-[#AB6E3C] transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
};
