"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart2,
  ChefHat,
  Clock3,
  Map,
  Menu as MenuIcon,
  QrCode,
  UsersRound,
} from "lucide-react";

const FEATURES = [
  { icon: MenuIcon, key: "menu_management", accent: "#cf8147", metric: "03" },
  { icon: QrCode, key: "qr_ordering", accent: "#90b978", metric: "18" },
  { icon: BarChart2, key: "smart_analytics", accent: "#e6b15d", metric: "41%" },
  { icon: UsersRound, key: "staff_management", accent: "#8db87a", metric: "23" },
];

export const FeaturesSection = () => {
  const t = useTranslations("landing");
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#080705] px-5 py-20 sm:px-8 lg:px-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2c089]/25 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-4 text-sm font-semibold text-[#d08a4d]">
            {t("features.eyebrow")}
          </p>
          <h2 className="max-w-md text-balance text-4xl font-semibold leading-tight text-[#fff7e9] sm:text-5xl">
            {t("features.title")}
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[#b8a58e]">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, key, accent, metric }, index) => (
            <motion.article
              key={key}
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="group min-h-[250px] rounded-lg border border-[#f1dcc4]/12 bg-[#14100b] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#d59156]/40 hover:bg-[#1b140d]"
            >
              <div className="mb-10 flex items-start justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-mono text-3xl font-semibold tabular-nums text-[#fff7e9]/20 transition-colors group-hover:text-[#fff7e9]/40">
                  {metric}
                </div>
              </div>
              <h3 className="max-w-[14rem] text-xl font-semibold text-[#fff7e9]">
                {t(`features.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#b8a58e]">
                {t(`features.${key}.benefit`)}
              </p>
              <ArrowRight className="mt-8 h-4 w-4 text-[#d08a4d] transition-transform group-hover:translate-x-1" />
            </motion.article>
          ))}

          <motion.article
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: 0.32 }}
            className="relative min-h-[250px] overflow-hidden rounded-lg border border-[#f1dcc4]/12 bg-[#ece4d6] p-5 text-[#18120c] sm:col-span-2"
          >
            <div className="absolute right-5 top-5 flex gap-2 text-[#6c7657]">
              <Clock3 className="h-5 w-5" />
              <ChefHat className="h-5 w-5" />
              <Map className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[#9d6338]">
              {t("features.control_strip.eyebrow")}
            </p>
            <h3 className="mt-4 max-w-xl text-3xl font-semibold leading-tight">
              {t("features.control_strip.title")}
            </h3>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["orders", "branches", "payout"].map((item) => (
                <div key={item} className="rounded-lg border border-[#17110b]/10 bg-white/55 p-4">
                  <p className="text-xs font-medium text-[#776653]">
                    {t(`features.control_strip.${item}.label`)}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {t(`features.control_strip.${item}.value`)}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
};
