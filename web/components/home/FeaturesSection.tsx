"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  Menu as MenuIcon,
  QrCode,
  CalendarDays,
  BarChart2,
  Users,
  Phone,
} from "lucide-react";

const FEATURES = [
  { icon: MenuIcon,      key: "menu_management",     accent: "#36B080" },
  { icon: QrCode,        key: "qr_ordering",          accent: "#AB6E3C" },
  { icon: CalendarDays,  key: "booking_preordering",  accent: "#36B080" },
  { icon: BarChart2,     key: "smart_analytics",      accent: "#AB6E3C" },
  { icon: Users,         key: "staff_management",     accent: "#36B080" },
  { icon: Phone,         key: "mobile_first",         accent: "#AB6E3C" },
];

export const FeaturesSection = () => {
  const t = useTranslations("landing");

  return (
    <section className="py-20 px-5" style={{ background: "linear-gradient(160deg, #F5EAD8 0%, #FAF3EA 100%)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#2E2117]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t("features.title")}
          </h2>
          <p className="mt-4 text-base text-[#8B6E5A] max-w-xl mx-auto leading-relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, key, accent }) => (
            <div
              key={key}
              className="rounded-2xl p-6 border border-[#AB6E3C]/10 bg-[#FEFAF6]"
              style={{ boxShadow: "0 2px 12px rgba(171,110,60,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}14` }}
              >
                <Icon size={20} style={{ color: accent }} />
              </div>
              <h3 className="text-base font-semibold text-[#2E2117] mb-1.5">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-sm text-[#8B6E5A] leading-relaxed">
                {t(`features.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
