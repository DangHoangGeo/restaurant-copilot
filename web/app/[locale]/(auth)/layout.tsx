"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Moon, UtensilsCrossed, Bell, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTheme } from "next-themes";

interface AuthPageLayoutProps {
  children: ReactNode;
}

// Mirrors iOS AuthHeroCluster (.welcome variant) icon positions and colors
const HERO_ICONS = [
  { Icon: UtensilsCrossed, color: "#36B080", bg: "rgba(54,176,128,0.14)",  top: "28%", left: "12%" },
  { Icon: Bell,            color: "#AB6E3C", bg: "rgba(171,110,60,0.10)",  top: "22%", left: "68%" },
  { Icon: Sparkles,        color: "#AB6E3C", bg: "rgba(171,110,60,0.08)",  top: "60%", left: "16%" },
  { Icon: CheckCircle,     color: "#36B080", bg: "rgba(54,176,128,0.12)",  top: "62%", left: "70%" },
];

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #FAF3EA 0%, #F5EAD8 60%, #EFE0CA 100%)" }}>
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center bg-[#FAF3EA]/80 backdrop-blur-md border-b border-[#AB6E3C]/10">
        <div className="w-full px-5 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <Image src="/coorder-ai.png" alt="CoOrder.ai" width={26} height={26} className="w-6.5 h-6.5" />
            <span
              className="text-base font-medium text-[#2E2117]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher
              currentLocale={locale}
              onLocaleChange={(newLocale) => {
                const currentPath = window.location.pathname.split("/").slice(2).join("/");
                window.location.href = `/${newLocale}/${currentPath}`;
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-8 w-8 text-[#8B6E5A]"
              aria-label={tCommon("theme.toggle_aria_label") || "Toggle theme"}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Left hero panel (desktop only) ── */}
        <aside
          className="hidden lg:flex lg:w-[400px] xl:w-[480px] flex-shrink-0 flex-col relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #FAF3EA 0%, #F0E3CC 60%, #E8D5B8 100%)",
            borderRight: "1px solid rgba(171,110,60,0.12)",
          }}
        >
          {/* Central glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 320,
              height: 320,
              top: "calc(50% - 160px)",
              left: "calc(50% - 160px)",
              background: "radial-gradient(circle, rgba(54,176,128,0.09) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
            aria-hidden="true"
          />

          {/* Floating icons */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <style>{`
              .auth-icon-float { animation: authFloat 5.8s ease-in-out infinite; }
              .auth-icon-float:nth-child(1) { animation-duration: 5.4s; }
              .auth-icon-float:nth-child(2) { animation-duration: 6.2s; animation-delay: 1.0s; }
              .auth-icon-float:nth-child(3) { animation-duration: 5.8s; animation-delay: 1.8s; }
              .auth-icon-float:nth-child(4) { animation-duration: 6.5s; animation-delay: 0.5s; }
              @keyframes authFloat {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-10px); }
              }
            `}</style>
            {HERO_ICONS.map(({ Icon, color, bg, top, left }, i) => (
              <div key={i} className="auth-icon-float absolute" style={{ top, left }}>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 48,
                    height: 48,
                    background: bg,
                    border: `1px solid ${color}28`,
                    boxShadow: `0 4px 14px ${color}18`,
                  }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Hero content */}
          <div className="relative z-10 flex flex-col h-full px-10 py-12">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-3 w-fit">
              <Image src="/coorder-ai.png" alt="CoOrder.ai" width={28} height={28} className="w-7 h-7" />
              <span
                className="text-base font-medium text-[#2E2117]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
              </span>
            </Link>

            {/* Centered headline */}
            <div className="flex-1 flex flex-col justify-center">
              <h1
                className="text-4xl xl:text-5xl font-medium leading-tight tracking-tight text-[#2E2117]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Run your<br />restaurant<br />
                <span style={{ color: "#AB6E3C" }}>from your phone.</span>
              </h1>
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between pt-6 border-t border-[#AB6E3C]/15">
              <p className="text-xs text-[#8B6E5A]/60">
                © {new Date().getFullYear()} Coorder.ai
              </p>
              <div className="flex items-center gap-2">
                <LanguageSwitcher
                  currentLocale={locale}
                  onLocaleChange={(newLocale) => {
                    const currentPath = window.location.pathname.split("/").slice(2).join("/");
                    window.location.href = `/${newLocale}/${currentPath}`;
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="h-8 w-8 text-[#8B6E5A] hover:text-[#AB6E3C] hover:bg-[#AB6E3C]/08"
                  aria-label={tCommon("theme.toggle_aria_label") || "Toggle theme"}
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right form panel ── */}
        <main
          className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          style={{ background: "linear-gradient(160deg, #FAF3EA 0%, #F5EAD8 60%, #EFE0CA 100%)" }}
        >
          <div className="flex flex-col min-h-full">
            {children}
          </div>

          {/* Desktop footer */}
          <footer className="hidden lg:flex items-center justify-between px-8 py-4 border-t border-[#AB6E3C]/10 text-xs text-[#8B6E5A]/60">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/privacy`} className="hover:text-[#AB6E3C] transition-colors">
                {t("footer.privacy")}
              </Link>
              <Link href={`/${locale}/terms`} className="hover:text-[#AB6E3C] transition-colors">
                {t("footer.terms")}
              </Link>
            </div>
            <p>© {new Date().getFullYear()} Coorder.ai · {t("footer.rights")}</p>
          </footer>
        </main>
      </div>

      {/* Mobile footer */}
      <footer className="lg:hidden flex items-center justify-between px-5 py-4 border-t border-[#AB6E3C]/10 text-xs text-[#8B6E5A]/60">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/privacy`} className="hover:text-[#AB6E3C] transition-colors">
            {t("footer.privacy")}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-[#AB6E3C] transition-colors">
            {t("footer.terms")}
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Coorder.ai</p>
      </footer>
    </div>
  );
}
