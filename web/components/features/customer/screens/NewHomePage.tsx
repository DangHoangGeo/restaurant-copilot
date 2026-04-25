import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createThemeProperties, sanitizeHexColor } from "@/lib/utils/colors";
import { cn } from "@/lib/utils";
import type { CustomerHomepageData } from "@/shared/types";

interface NewHomePageProps {
  locale: string;
  initialData: CustomerHomepageData | null;
}

type OpeningHoursRecord = Record<
  string,
  {
    isClosed?: boolean;
    openTime?: string;
    closeTime?: string;
  }
>;

function getLocalizedText(
  locale: string,
  values: { en?: string | null; ja?: string | null; vi?: string | null },
): string {
  if (locale === "ja" && values.ja) return values.ja;
  if (locale === "vi" && values.vi) return values.vi;
  return values.en ?? values.ja ?? values.vi ?? "";
}

function parseOpeningHours(value: unknown): OpeningHoursRecord {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as OpeningHoursRecord;
    } catch {
      return {};
    }
  }
  return value as OpeningHoursRecord;
}

function getTodayKey(): string {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date().getDay()];
}

function getTodayHoursLabel(value: unknown): string | null {
  const hours = parseOpeningHours(value);
  const todayHours = hours[getTodayKey()];
  if (!todayHours || todayHours.isClosed) return null;
  if (!todayHours.openTime || !todayHours.closeTime) return null;
  return `${todayHours.openTime} - ${todayHours.closeTime}`;
}

function isOpenNow(value: unknown): boolean {
  const hours = parseOpeningHours(value);
  const todayHours = hours[getTodayKey()];
  if (!todayHours || todayHours.isClosed) return false;
  if (!todayHours.openTime || !todayHours.closeTime) return false;

  const [openHour, openMinute] = todayHours.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = todayHours.closeTime.split(":").map(Number);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function getMenuHref(
  locale: string,
  branchCode: string | null,
  subdomain: string,
): string {
  const branch = branchCode ?? subdomain;
  return `/${locale}/menu?branch=${branch}`;
}

function getBookingHref(
  locale: string,
  branchCode: string | null,
  subdomain: string,
): string {
  const branch = branchCode ?? subdomain;
  return `/${locale}/booking?branch=${branch}`;
}

function formatPrice(
  price: number,
  currency: string | null,
  locale: string,
): string {
  const resolvedCurrency = currency ?? "JPY";
  const resolvedLocale =
    locale === "ja" ? "ja-JP" : locale === "vi" ? "vi-VN" : "en-US";

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: resolvedCurrency === "JPY" ? 0 : 2,
    }).format(price);
  } catch {
    return `${price.toFixed(0)} ${resolvedCurrency}`;
  }
}

export async function NewHomePage({ locale, initialData }: NewHomePageProps) {
  const t = await getTranslations({ locale, namespace: "customer.home" });

  if (!initialData) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
          <p className="mt-3 text-sm text-slate-300">
            {t("notFound.description")}
          </p>
        </div>
      </div>
    );
  }

  const { company, currentBranch, branches, owners, gallery, featuredItems } =
    initialData;
  const brandColor = sanitizeHexColor(
    company.brandColor ?? currentBranch.brandColor ?? "#2563eb",
  );
  const themeProperties = createThemeProperties(brandColor);
  const description =
    getLocalizedText(locale, {
      en: company.description_en,
      ja: company.description_ja,
      vi: company.description_vi,
    }) ||
    getLocalizedText(locale, {
      en: currentBranch.description_en,
      ja: currentBranch.description_ja,
      vi: currentBranch.description_vi,
    });
  const currentTagline = getLocalizedText(locale, {
    en: currentBranch.tagline_en,
    ja: currentBranch.tagline_ja,
    vi: currentBranch.tagline_vi,
  });
  const openBranches = branches.filter((branch) =>
    isOpenNow(branch.openingHours),
  ).length;
  const todayHours = getTodayHoursLabel(currentBranch.openingHours);
  const heroImages = gallery.length > 0 ? gallery.slice(0, 3) : [];
  const leadOwner = owners[0] ?? null;

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={themeProperties as CSSProperties}
    >
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `
              radial-gradient(circle at top left, var(--theme-primary-700), transparent 38%),
              radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 24%),
              linear-gradient(180deg, #020617 0%, #0f172a 54%, #111827 100%)
            `,
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <main className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:gap-8">
            <div className="rounded-[32px] border border-white/10 bg-white/8 p-5 backdrop-blur md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {branches.length > 1
                    ? t("hero.companyBadge")
                    : t("hero.branchBadge")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-medium text-emerald-200">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t("hero.openBranches", {
                    count: openBranches,
                    total: branches.length,
                  })}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-black/30">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={`${company.name} logo`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-7 w-7 text-white/80" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-300">
                    {branches.length > 1
                      ? t("hero.collectionLabel")
                      : t("hero.branchLabel")}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    {company.name}
                  </h1>
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-[var(--theme-primary)]">
                    {t("locations.currentBranch")}: {currentBranch.name}
                  </p>
                </div>
              </div>

              {currentTagline ? (
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-200 sm:text-xl">
                  {currentTagline}
                </p>
              ) : null}

              {description ? (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  {description}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {t("hero.stats.branches")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {branches.length}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {t("hero.stats.featured")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {featuredItems.length}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {t("hero.stats.todayHours")}
                  </p>
                  <p className="mt-2 text-base font-medium text-white">
                    {todayHours ?? t("hero.closedToday")}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-2xl border-0 px-5 text-sm font-semibold text-white shadow-lg shadow-black/30"
                  style={{ backgroundColor: "var(--theme-primary)" }}
                >
                  <Link
                    href={getMenuHref(
                      locale,
                      currentBranch.branchCode,
                      currentBranch.subdomain,
                    )}
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    {t("hero.viewMenu")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/15 bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12"
                >
                  <Link href="#locations">
                    <MapPin className="h-4 w-4" />
                    {t("hero.viewLocations")}
                  </Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {branches.slice(0, 5).map((branch) => (
                  <Link
                    key={branch.id}
                    href={getMenuHref(
                      locale,
                      branch.branchCode,
                      branch.subdomain,
                    )}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                      branch.isCurrent
                        ? "border-white/20 bg-white/12 text-white"
                        : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-[var(--theme-primary)]" />
                    {branch.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/8 backdrop-blur">
                {heroImages[0] ? (
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={heroImages[0].imageUrl}
                      alt={heroImages[0].altText}
                      fill
                      priority
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                        {t("hero.currentBranchLabel")}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {currentBranch.name}
                      </p>
                      {currentBranch.address ? (
                        <p className="mt-2 flex items-start gap-2 text-sm text-slate-200">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{currentBranch.address}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex aspect-[4/3] items-end p-5"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--theme-primary-500), rgba(15, 23, 42, 0.85))",
                    }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-200">
                        {t("hero.currentBranchLabel")}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {currentBranch.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <Phone className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        {t("hero.contactLabel")}
                      </p>
                      <p className="mt-1 text-sm text-slate-200">
                        {currentBranch.phone ??
                          company.phone ??
                          t("common.unavailable")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        {t("hero.ratingLabel")}
                      </p>
                      <p className="mt-1 text-sm text-slate-200">
                        {currentBranch.googleRating
                          ? t("hero.ratingValue", {
                              rating: currentBranch.googleRating.toFixed(1),
                              count: currentBranch.googleReviewCount ?? 0,
                            })
                          : t("hero.ratingFallback")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {t("featured.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    {t("featured.title")}
                  </h2>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white"
                >
                  <Link
                    href={getMenuHref(
                      locale,
                      currentBranch.branchCode,
                      currentBranch.subdomain,
                    )}
                  >
                    {t("featured.fullMenu")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {featuredItems.length > 0 ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {featuredItems.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/65"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={getLocalizedText(locale, {
                              en: item.name_en,
                              ja: item.name_ja,
                              vi: item.name_vi,
                            })}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full items-center justify-center"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--theme-primary-500), rgba(15, 23, 42, 0.4))",
                            }}
                          >
                            <UtensilsCrossed className="h-10 w-10 text-white/85" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                          <span className="rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 backdrop-blur">
                            {item.sourceType === "shared"
                              ? t("featured.sharedBadge")
                              : t("featured.branchBadge")}
                          </span>
                          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">
                            {formatPrice(item.price, item.currency, locale)}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        {item.categoryName_en ||
                        item.categoryName_ja ||
                        item.categoryName_vi ? (
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--theme-primary)]">
                            {getLocalizedText(locale, {
                              en: item.categoryName_en,
                              ja: item.categoryName_ja,
                              vi: item.categoryName_vi,
                            })}
                          </p>
                        ) : null}
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {getLocalizedText(locale, {
                            en: item.name_en,
                            ja: item.name_ja,
                            vi: item.name_vi,
                          })}
                        </h3>
                        <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-300">
                          {getLocalizedText(locale, {
                            en: item.description_en,
                            ja: item.description_ja,
                            vi: item.description_vi,
                          }) || t("featured.descriptionFallback")}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">
                            {item.sourceType === "shared"
                              ? t("featured.sharedAvailability")
                              : t("featured.fromBranch", {
                                  branch: item.branchName ?? t("common.branch"),
                                })}
                          </span>
                          <Button
                            asChild
                            size="sm"
                            className="rounded-full text-white"
                            style={{ backgroundColor: "var(--theme-primary)" }}
                          >
                            <Link
                              href={getMenuHref(
                                locale,
                                item.branchCode,
                                item.branchSubdomain ?? currentBranch.subdomain,
                              )}
                            >
                              {t("featured.viewItemCta")}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-white/12 bg-black/20 p-8 text-center">
                  <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-base font-medium text-white">
                    {t("featured.emptyTitle")}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {t("featured.emptyDescription")}
                  </p>
                </div>
              )}
            </div>

            <aside className="rounded-[32px] border border-white/10 bg-white/6 p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {t("story.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {t("story.title")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {description || t("story.fallbackDescription")}
              </p>

              {leadOwner ? (
                <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/8">
                      {leadOwner.photoUrl ? (
                        <Image
                          src={leadOwner.photoUrl}
                          alt={leadOwner.name ?? company.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="h-5 w-5 text-white/80" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        {t("story.ownerLabel")}
                      </p>
                      <p className="mt-1 truncate text-base font-medium text-white">
                        {leadOwner.name ?? company.name}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {leadOwner.email ?? company.email ?? ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {heroImages.length > 1 ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {heroImages.slice(1, 3).map((image) => (
                    <div
                      key={image.id}
                      className="relative aspect-square overflow-hidden rounded-[24px] border border-white/10"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.altText}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>
          </section>

          <section
            id="locations"
            className="rounded-[32px] border border-white/10 bg-white/6 p-5 md:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  {t("locations.eyebrow")}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {branches.map((branch) => {
                const branchOpen = isOpenNow(branch.openingHours);
                const branchHours = getTodayHoursLabel(branch.openingHours);

                return (
                  <article
                    key={branch.id}
                    className={cn(
                      "rounded-[28px] border p-5 transition-all",
                      branch.isCurrent
                        ? "border-[var(--theme-primary)] bg-[var(--theme-primary-50)]"
                        : "border-white/10 bg-slate-950/55",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/8">
                        {branch.logoUrl ? (
                          <Image
                            src={branch.logoUrl}
                            alt={`${branch.name} logo`}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-5 w-5 text-white/80" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {branch.name}
                          </h3>
                          {branch.isCurrent ? (
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-primary)]"
                              style={{
                                backgroundColor: "var(--theme-primary-100)",
                              }}
                            >
                              {t("locations.currentBranch")}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            "mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                            branchOpen
                              ? "bg-emerald-400/12 text-emerald-200"
                              : "bg-white/8 text-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              branchOpen ? "bg-emerald-400" : "bg-slate-500",
                            )}
                          />
                          {branchOpen
                            ? t("locations.openNow")
                            : t("locations.closedNow")}
                        </p>
                      </div>
                    </div>

                    {branch.address ? (
                      <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-300">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                        <span>{branch.address}</span>
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-[var(--theme-primary)]" />
                        <span>
                          {branchHours ?? t("locations.hoursFallback")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--theme-primary)]" />
                        <span>
                          {branch.phone ??
                            company.phone ??
                            t("common.unavailable")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button
                        asChild
                        className="flex-1 rounded-2xl text-white"
                        style={{ backgroundColor: "var(--theme-primary)" }}
                      >
                        <Link
                          href={getMenuHref(
                            locale,
                            branch.branchCode,
                            branch.subdomain,
                          )}
                        >
                          {t("locations.viewMenu")}
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                      >
                        <Link
                          href={getBookingHref(
                            locale,
                            branch.branchCode,
                            branch.subdomain,
                          )}
                        >
                          <CalendarDays className="h-4 w-4" />
                          {t("locations.reserve")}
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
