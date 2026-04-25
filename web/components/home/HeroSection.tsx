"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChefHat,
  Clock3,
  Compass,
  MapPin,
  ShoppingBag,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicPlatformStats } from "@/lib/server/public-platform-stats";

interface HeroSectionProps {
  stats: PublicPlatformStats;
}

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);

const serviceCards = [
  { label: "Orders", icon: ShoppingBag, tone: "from-[#c87b3f] to-[#f2b36b]" },
  { label: "Menus", icon: ChefHat, tone: "from-[#8aa267] to-[#d8d4a1]" },
  { label: "Branches", icon: Store, tone: "from-[#a76c3f] to-[#db9a62]" },
  { label: "Staff", icon: UsersRound, tone: "from-[#6e8f69] to-[#b8c27b]" },
  { label: "Money", icon: WalletCards, tone: "from-[#b98745] to-[#efc06e]" },
];

export const HeroSection = ({ stats }: HeroSectionProps) => {
  const t = useTranslations("landing");
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative isolate min-h-[calc(100dvh-56px)] overflow-hidden px-5 pb-10 pt-8 sm:px-8 lg:px-10"
      aria-labelledby="landing-hero-title"
    >
      <Image
        src="/landing/restaurant-ops-backdrop.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center opacity-70"
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_30%,rgba(205,128,62,0.22),transparent_34%),linear-gradient(90deg,rgba(8,7,5,0.98),rgba(8,7,5,0.78)_42%,rgba(8,7,5,0.34)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#080705] to-transparent" />

      <div className="mx-auto grid min-h-[calc(100dvh-116px)] w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl pt-6"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c9854f]/25 bg-[#130f0a]/70 px-3 py-2 text-xs font-medium text-[#eac7a1] shadow-[0_0_40px_rgba(201,133,79,0.13)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#78c47b]" />
            {t("hero.live_badge")}
          </div>

          <h1
            id="landing-hero-title"
            className="max-w-[11ch] text-balance text-6xl font-semibold leading-[0.92] text-[#fff7e9] sm:text-7xl lg:text-8xl"
          >
            {t("hero.headline")}
            <span className="block bg-gradient-to-r from-[#c77a3f] via-[#efa45f] to-[#f1c982] bg-clip-text text-transparent">
              {t("hero.headline_accent")}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#d7c4ad] sm:text-lg">
            {t("hero.subheadline")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${locale}/signup`}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-5 text-sm font-semibold text-white shadow-[0_16px_44px_rgba(200,121,63,0.34)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d98d4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb16c]"
            >
              {t("hero.cta.signup")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/discover`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#f1dcc4]/18 bg-[#fff7e9]/8 px-5 text-sm font-semibold text-[#fff7e9] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff7e9]/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb16c]"
            >
              <Compass className="h-4 w-4" />
              {t("hero.cta.discover")}
            </Link>
          </div>

          <div className="mt-9 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#f1dcc4]/14 bg-[#100d09]/70 p-4 backdrop-blur">
              <div className="text-3xl font-semibold tabular-nums text-[#fff7e9]">
                {formatCompactNumber(stats.restaurantCount)}
              </div>
              <div className="mt-1 text-xs font-medium text-[#b8a58e]">
                {t("hero.stats.restaurants")}
              </div>
            </div>
            <div className="rounded-lg border border-[#f1dcc4]/14 bg-[#100d09]/70 p-4 backdrop-blur">
              <div className="text-3xl font-semibold tabular-nums text-[#fff7e9]">
                {formatCompactNumber(stats.ordersLast24Hours)}
              </div>
              <div className="mt-1 text-xs font-medium text-[#b8a58e]">
                {t("hero.stats.orders")}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 28, rotate: 1 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto h-[590px] w-full max-w-[620px] lg:mr-0"
        >
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[290px] -translate-x-1/2 -translate-y-1/2 rotate-[7deg] rounded-[2.2rem] border border-white/18 bg-[#12100d] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.72)]">
            <div className="h-full rounded-[1.7rem] border border-white/8 bg-[#17130f] p-5">
              <div className="flex items-center justify-between text-xs text-[#e8dccb]">
                <span>9:41</span>
                <Bell className="h-4 w-4 text-[#d08a4d]" />
              </div>
              <div className="mt-7">
                <p className="text-sm text-[#b9a995]">Good morning</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#fff7e9]">Service is moving</h2>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#fff7e9]">Live orders</span>
                  <span className="rounded-full bg-[#6aae6d]/18 px-2 py-1 text-xs text-[#9ee39f]">18</span>
                </div>
                {["#1024 Dine-in", "#1025 Takeaway", "#1026 Delivery"].map((order, index) => (
                  <div key={order} className="flex items-center justify-between border-t border-white/8 py-3 text-xs first:border-t-0 first:pt-0">
                    <span className="flex items-center gap-2 text-[#e8dccb]">
                      <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#d67e48]" : index === 1 ? "bg-[#93bf79]" : "bg-[#eab75d]"}`} />
                      {order}
                    </span>
                    <span className="text-[#8f806e]">{2 + index * 3}m</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <UsersRound className="mb-5 h-4 w-4 text-[#a9cf82]" />
                  <p className="text-xs text-[#b9a995]">On shift</p>
                  <p className="mt-1 text-xl font-semibold text-[#fff7e9]">23</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <BarChart3 className="mb-5 h-4 w-4 text-[#efaa62]" />
                  <p className="text-xs text-[#b9a995]">Sales</p>
                  <p className="mt-1 text-xl font-semibold text-[#fff7e9]">$8.9k</p>
                </div>
              </div>
            </div>
          </div>

          {[
            { label: "Kitchen", value: "On time", icon: ChefHat, className: "right-2 top-24" },
            { label: "Delivery", value: "Ready", icon: Clock3, className: "right-0 top-64" },
            { label: "Payout", value: "Sent", icon: WalletCards, className: "right-7 bottom-24" },
            { label: "Downtown", value: "Open", icon: MapPin, className: "left-0 top-44" },
          ].map(({ label, value, icon: Icon, className }, index) => (
            <motion.div
              key={label}
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute hidden rounded-lg border border-[#e3c6a1]/18 bg-[#10100b]/82 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur md:block ${className}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-[#a8d47b]" />
                <div>
                  <p className="text-sm font-semibold text-[#fff7e9]">{label}</p>
                  <p className="text-xs text-[#95d18a]">{value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="mx-auto -mt-4 grid w-full max-w-7xl grid-cols-2 gap-3 sm:grid-cols-5">
        {serviceCards.map(({ label, icon: Icon, tone }) => (
          <Link
            key={label}
            href={`/${locale}/signup`}
            className="group rounded-lg border border-[#f1dcc4]/12 bg-[#141009] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#d59156]/50 hover:bg-[#1b140d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb16c]"
          >
            <div className={`mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tone} text-[#141009]`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-[#fff7e9]">
              {label}
              <ArrowRight className="h-4 w-4 text-[#a99680] transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-6 w-full max-w-7xl rounded-lg border border-[#f1dcc4]/12 bg-[#100d09]/85 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#fff7e9]">
            <span className="rounded-md bg-[#78c47b]/18 px-2 py-1 text-xs text-[#93df94]">LIVE</span>
            {t("hero.timeline.title")}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 text-xs text-[#b9a995] sm:flex sm:items-center sm:justify-end">
            {["received", "preparing", "ready", "delivering"].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${index === 2 ? "bg-[#d68a4e]" : "bg-[#655948]"}`} />
                {t(`hero.timeline.${step}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
