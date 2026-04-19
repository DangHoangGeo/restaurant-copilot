"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Moon, UtensilsCrossed, Bell, Sparkles, BarChart3, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useTheme } from "next-themes";

interface AuthPageLayoutProps {
  children: ReactNode;
}

const heroIcons = [
  { Icon: UtensilsCrossed, delay: "0s",    top: "20%", left: "15%",  size: 28, rotate: "-12deg" },
  { Icon: Bell,            delay: "0.4s",  top: "35%", left: "72%",  size: 22, rotate: "8deg"  },
  { Icon: Sparkles,        delay: "0.8s",  top: "58%", left: "20%",  size: 20, rotate: "0deg"  },
  { Icon: BarChart3,       delay: "1.2s",  top: "65%", left: "68%",  size: 24, rotate: "-6deg" },
  { Icon: Users,           delay: "1.6s",  top: "15%", left: "60%",  size: 20, rotate: "10deg" },
  { Icon: Zap,             delay: "2.0s",  top: "78%", left: "42%",  size: 18, rotate: "-8deg" },
];

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Mobile header — only visible below lg */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/coorder-ai.png" alt="CoOrder.ai" width={28} height={28} className="w-7 h-7" />
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">
              coorder<span className="text-orange-500">.ai</span>
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
              className="h-8 w-8 text-slate-500 dark:text-slate-400"
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
        <aside className="hidden lg:flex lg:w-[440px] xl:w-[520px] flex-shrink-0 flex-col relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                                radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating restaurant operation icons */}
          <div className="absolute inset-0 pointer-events-none">
            {heroIcons.map(({ Icon, delay, top, left, size, rotate }, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  top,
                  left,
                  animation: `floatIcon 6s ease-in-out infinite`,
                  animationDelay: delay,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg"
                  style={{
                    width: size + 20,
                    height: size + 20,
                    transform: `rotate(${rotate})`,
                  }}
                >
                  <Icon size={size} className="text-white/90" />
                </div>
              </div>
            ))}
          </div>

          {/* Hero content */}
          <div className="relative z-10 flex flex-col h-full px-10 py-12">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-3 group w-fit">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Image src="/coorder-ai.png" alt="CoOrder.ai" width={28} height={28} className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                coorder<span className="text-white/70">.ai</span>
              </span>
            </Link>

            {/* Center headline */}
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                  <Sparkles size={12} className="text-amber-200" />
                  <span className="text-xs font-medium text-white/90 tracking-wide uppercase">Restaurant OS</span>
                </div>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                  Run your<br />restaurant<br />
                  <span className="text-amber-200">from your phone.</span>
                </h1>
              </div>

              <p className="text-white/75 text-base leading-relaxed max-w-xs">
                Orders, staff, menus, and money — all in one calm, clear operating system built for real operators.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {["Multi-branch", "AI-powered", "Mobile-first", "Real-time"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-white/80 bg-white/10 border border-white/20 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between pt-6 border-t border-white/15">
              <p className="text-xs text-white/50">
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
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
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
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col min-h-full">
              {children}
            </div>
          </div>

          {/* Footer — desktop */}
          <footer className="hidden lg:block border-t border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm py-4 px-8">
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-4">
                <Link href={`/${locale}/privacy`} className="hover:text-orange-500 transition-colors">
                  {t("footer.privacy")}
                </Link>
                <Link href={`/${locale}/terms`} className="hover:text-orange-500 transition-colors">
                  {t("footer.terms")}
                </Link>
              </div>
              <p>© {new Date().getFullYear()} Coorder.ai · {t("footer.rights")}</p>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile footer */}
      <footer className="lg:hidden border-t border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm py-4 px-4">
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/privacy`} className="hover:text-orange-500 transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-orange-500 transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Coorder.ai</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(var(--rotate, 0deg)); }
          50%       { transform: translateY(-12px) rotate(var(--rotate, 0deg)); }
        }
      `}</style>
    </div>
  );
}
