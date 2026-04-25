"use client";

import Image from "next/image";
import { MapPin, Star, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { DiscoverBranch } from "@/shared/types/discover";

interface Props {
  branch: DiscoverBranch;
  locale: string;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "fill-slate-200 text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

function BrandInitials({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="w-full h-full flex items-center justify-center text-white font-bold text-2xl select-none"
      style={{ backgroundColor: color ?? "#6366f1" }}
    >
      {initials || "?"}
    </div>
  );
}

function buildMenuUrl(branch: DiscoverBranch, locale: string): string {
  const rootDomain =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PRODUCTION_URL ?? "coorder.ai"
      : process.env.NEXT_PUBLIC_PRODUCTION_URL ?? "coorder.ai";

  const subdomain = branch.org?.publicSubdomain ?? branch.subdomain;

  // In development localhost context, use path-based routing fallback.
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("localhost")
  ) {
    return `http://${subdomain}.localhost:3000/${locale}/menu`;
  }

  return `https://${subdomain}.${rootDomain}/${locale}/menu`;
}

export function RestaurantCard({ branch, locale }: Props) {
  const t = useTranslations("discover");

  const tagline = getLocalizedText(
    {
      name_en: branch.tagline_en ?? "",
      name_ja: branch.tagline_ja ?? "",
      name_vi: branch.tagline_vi ?? "",
    },
    locale,
  );

  const menuUrl = buildMenuUrl(branch, locale);
  const brandColor = branch.brandColor ?? "#6366f1";

  const locationParts: string[] = [];
  if (branch.district) locationParts.push(branch.district);
  if (branch.province) locationParts.push(branch.province);
  const locationLabel =
    locationParts.length > 0 ? locationParts.join(", ") : branch.address;

  return (
    <a
      href={menuUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-700 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
    >
      {/* Logo / Hero Area */}
      <div className="relative w-full h-40 overflow-hidden bg-slate-100 dark:bg-slate-700">
        {branch.logoUrl ? (
          <Image
            src={branch.logoUrl}
            alt={branch.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <BrandInitials name={branch.name} color={brandColor} />
        )}

        {/* Org brand badge */}
        {branch.org && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
            {branch.org.logoUrl && (
              <Image
                src={branch.org.logoUrl}
                alt={branch.org.name}
                width={16}
                height={16}
                className="rounded-full"
              />
            )}
            <span className="text-white text-[10px] font-medium leading-none">
              {branch.org.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Name */}
        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {branch.name}
        </h3>

        {/* Rating */}
        {branch.googleRating ? (
          <div className="flex items-center gap-1.5">
            <StarRating rating={branch.googleRating} />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {branch.googleRating.toFixed(1)}
            </span>
            {branch.googleReviewCount ? (
              <span className="text-xs text-slate-400">
                {t("card.reviews", { count: branch.googleReviewCount })}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">
            {t("card.no_rating")}
          </span>
        )}

        {/* Location */}
        {locationLabel && (
          <div className="flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{locationLabel}</span>
          </div>
        )}

        {/* Tagline */}
        {tagline && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-auto pt-1">
            {tagline}
          </p>
        )}

        {/* CTA */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: brandColor }}
          >
            {t("card.view_menu")}
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
