"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UtensilsCrossed, Bell, Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

// Floating icon positions mirror the iOS AuthHeroCluster (.welcome variant)
const ICONS = [
  { Icon: UtensilsCrossed, color: "#36B080", bg: "rgba(54,176,128,0.12)", top: "calc(50% - 110px)", left: "calc(50% - 170px)", delay: "0s",   dur: "5.5s" },
  { Icon: Bell,            color: "#AB6E3C", bg: "rgba(171,110,60,0.10)", top: "calc(50% - 90px)",  left: "calc(50% + 120px)", delay: "0.9s",  dur: "6.2s" },
  { Icon: Sparkles,        color: "#AB6E3C", bg: "rgba(171,110,60,0.08)", top: "calc(50% + 50px)",  left: "calc(50% - 130px)", delay: "1.8s",  dur: "5.8s" },
  { Icon: CheckCircle,     color: "#36B080", bg: "rgba(54,176,128,0.12)", top: "calc(50% + 42px)",  left: "calc(50% + 90px)",  delay: "0.5s",  dur: "6.5s" },
];

export const HeroSection = () => {
  const t = useTranslations("landing");
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <section
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-56px)] overflow-hidden px-6"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(54,176,128,0.08) 0%, transparent 60%), linear-gradient(160deg, #FAF3EA 0%, #F5EAD8 50%, #EFE0CA 100%)",
      }}
    >
      {/* Dark-mode background override */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          .hero-bg { background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(54,176,128,0.08) 0%, transparent 60%), linear-gradient(160deg, #170F0C 0%, #1E1209 50%, #251810 100%) !important; }
        }
        .hero-float { animation: heroFloat var(--dur, 5.5s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-11px); }
        }
      `}</style>

      {/* Floating icon cluster — absolutely positioned around center */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Central glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            top: "calc(50% - 140px)",
            left: "calc(50% - 140px)",
            background: "radial-gradient(circle, rgba(54,176,128,0.10) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />

        {ICONS.map(({ Icon, color, bg, top, left, delay, dur }, i) => (
          <div
            key={i}
            className="hero-float absolute"
            style={{ top, left, "--delay": delay, "--dur": dur } as React.CSSProperties}
          >
            <div
              className="flex items-center justify-center rounded-full border"
              style={{
                width: 52,
                height: 52,
                background: bg,
                borderColor: `${color}28`,
                boxShadow: `0 4px 16px ${color}18`,
              }}
            >
              <Icon size={22} style={{ color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm gap-5">
        <h1
          className="text-5xl sm:text-6xl font-medium leading-tight tracking-tight text-[#2E2117] dark:text-[#F7F1E9]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          coorder<span style={{ color: "#AB6E3C" }}>.ai</span>
        </h1>

        <p className="text-base text-[#8B6E5A] dark:text-[#B89078] leading-relaxed">
          {t("hero.subheadline")}
        </p>

        <Link
          href={`/${locale}/signup`}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm tracking-widest uppercase text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #AB6E3C 0%, #8B5A2B 100%)",
            boxShadow: "0 4px 16px rgba(171,110,60,0.30)",
            letterSpacing: "0.12em",
          }}
        >
          {t("hero.cta.signup")}
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Legal footer */}
      <div className="absolute bottom-8 flex items-center gap-4 text-xs text-[#8B6E5A]/70 dark:text-[#B89078]/60">
        <Link href={`/${locale}/terms`} className="hover:text-[#AB6E3C] transition-colors">
          {t("footer.legal.terms")}
        </Link>
        <span>·</span>
        <Link href={`/${locale}/privacy`} className="hover:text-[#AB6E3C] transition-colors">
          {t("footer.legal.privacy")}
        </Link>
      </div>
    </section>
  );
};
