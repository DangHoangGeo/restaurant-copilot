"use client";

import Image from "next/image";
import { ChefHat, ExternalLink, MapPin, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocalizedText } from "@/lib/customerUtils";
import type { DiscoverBranch } from "@/shared/types/discover";

interface Props {
  branch: DiscoverBranch;
  locale: string;
  host: string;
  priorityImage?: boolean;
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

function BrandChip({
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
      className="flex h-5 w-5 select-none items-center justify-center rounded text-[10px] font-semibold text-white"
      style={{ background: `linear-gradient(135deg, ${color ?? "#9d6338"}, #17110b)` }}
    >
      {initials || "?"}
    </div>
  );
}

function DishPlaceholder({ color }: { color: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `radial-gradient(circle at 50% 35%, ${color}55, transparent 32%), linear-gradient(135deg, #2a1d12, #0f0b07)`,
      }}
    >
      <div className="relative h-28 w-28 rounded-full border border-[#f6e8d3]/25 bg-[#f6e8d3]/10">
        <div className="absolute inset-5 rounded-full bg-[#f6e8d3]" />
        <div className="absolute inset-10 rounded-full bg-[#c8773e]" />
        <ChefHat className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#f6e8d3]" />
      </div>
    </div>
  );
}

function buildMenuUrl(branch: DiscoverBranch, locale: string, host: string): string {
  const subdomain = branch.org?.publicSubdomain ?? branch.subdomain;
  const [hostname, port] = host.split(":");

  if (hostname?.includes("localhost") || hostname === "127.0.0.1") {
    return `http://${subdomain}.localhost${port ? `:${port}` : ""}/${locale}/menu`;
  }

  const rootDomain = process.env.NEXT_PUBLIC_PRODUCTION_URL ?? "coorder.ai";
  return `https://${subdomain}.${rootDomain}/${locale}/menu`;
}

export function RestaurantCard({
  branch,
  locale,
  host,
  priorityImage = false,
}: Props) {
  const t = useTranslations("discover");

  const tagline = getLocalizedText(
    {
      name_en: branch.tagline_en ?? "",
      name_ja: branch.tagline_ja ?? "",
      name_vi: branch.tagline_vi ?? "",
    },
    locale,
  );

  const dishName = branch.featuredDish
    ? getLocalizedText(
        {
          name_en: branch.featuredDish.name_en,
          name_ja: branch.featuredDish.name_ja ?? "",
          name_vi: branch.featuredDish.name_vi ?? "",
        },
        locale,
      )
    : null;

  const menuUrl = buildMenuUrl(branch, locale, host);
  const brandColor = branch.brandColor ?? "#6366f1";

  const locationParts: string[] = [];
  if (branch.district) locationParts.push(branch.district);
  if (branch.province) locationParts.push(branch.province);
  const locationLabel =
    locationParts.length > 0 ? locationParts.join(", ") : branch.address;

  const formattedPrice = (() => {
    if (!branch.featuredDish?.currency) return null;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: branch.featuredDish.currency,
        maximumFractionDigits: 0,
      }).format(branch.featuredDish.price);
    } catch {
      return null;
    }
  })();

  return (
    <a
      href={menuUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-[#f1dcc4]/12 bg-[#14100b] shadow-[0_18px_52px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d18a4e]/50 hover:bg-[#1a130d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d18a4e]"
    >
      <div className="relative h-52 w-full overflow-hidden bg-[#211910]">
        {branch.featuredDish?.imageUrl ? (
          <Image
            src={branch.featuredDish.imageUrl}
            alt={dishName || branch.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priorityImage}
          />
        ) : (
          <DishPlaceholder color={brandColor === "#6366f1" ? "#c8773e" : brandColor} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#14100b] via-[#14100b]/20 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/62 px-2.5 py-1 backdrop-blur-sm">
          {branch.logoUrl ? (
            <Image
              src={branch.logoUrl}
              alt={branch.name}
              width={20}
              height={20}
              className="rounded"
              priority={priorityImage}
            />
          ) : branch.org?.logoUrl ? (
              <Image
                src={branch.org.logoUrl}
                alt={branch.org.name}
                width={20}
                height={20}
                className="rounded"
                priority={priorityImage}
              />
          ) : (
            <BrandChip name={branch.name} color={brandColor} />
          )}
          <span className="text-[10px] font-medium leading-none text-white">
            {branch.org?.name ?? branch.name}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-[#c8773e] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
            <Sparkles className="h-3 w-3" />
            {t("card.signature_dish")}
          </div>
          <div className="flex items-end justify-between gap-3">
            <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-[#fff7e9]">
              {dishName || t("card.signature_placeholder")}
            </h3>
            {formattedPrice && (
              <span className="shrink-0 rounded-md bg-[#0b0805]/72 px-2 py-1 text-xs font-semibold text-[#f6e8d3] backdrop-blur">
                {formattedPrice}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold leading-snug text-[#fff7e9] transition-colors group-hover:text-[#f0ad69]">
          {branch.name}
        </h3>

        {branch.googleRating ? (
          <div className="flex items-center gap-1.5">
            <StarRating rating={branch.googleRating} />
            <span className="text-xs font-semibold text-[#ead8bd]">
              {branch.googleRating.toFixed(1)}
            </span>
            {branch.googleReviewCount ? (
              <span className="text-xs text-[#8f806e]">
                {t("card.reviews", { count: branch.googleReviewCount })}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs italic text-[#8f806e]">
            {t("card.no_rating")}
          </span>
        )}

        {locationLabel && (
          <div className="flex items-start gap-1 text-xs text-[#b8a58e]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#d18a4e]" />
            <span className="line-clamp-1">{locationLabel}</span>
          </div>
        )}

        {tagline && (
          <p className="mt-auto line-clamp-2 pt-1 text-xs leading-5 text-[#9f907d]">
            {tagline}
          </p>
        )}

        <div className="mt-3 border-t border-[#f1dcc4]/10 pt-3">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: brandColor === "#6366f1" ? "#d18a4e" : brandColor }}
          >
            {t("card.view_menu")}
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
