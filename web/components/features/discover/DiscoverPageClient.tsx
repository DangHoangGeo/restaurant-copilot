"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestaurantCard } from "./RestaurantCard";
import type { DiscoverBranch, DiscoverApiResponse } from "@/shared/types/discover";

interface Props {
  initialData: DiscoverApiResponse;
  locale: string;
  host: string;
}

export function DiscoverPageClient({ initialData, locale, host }: Props) {
  const t = useTranslations("discover");
  const reduceMotion = useReducedMotion();

  const [branches, setBranches] = useState<DiscoverBranch[]>(
    initialData.branches,
  );
  const [provinces, setProvinces] = useState<string[]>(initialData.provinces);
  const [districts, setDistricts] = useState<string[]>(initialData.districts);

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBranches = useCallback(
    async (
      province: string | null,
      district: string | null,
      searchTerm: string,
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (province) params.set("province", province);
        if (district) params.set("district", district);
        if (searchTerm.trim()) params.set("search", searchTerm.trim());

        const res = await fetch(
          `/api/v1/public/restaurants?${params.toString()}`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const data: DiscoverApiResponse = await res.json();
        setBranches(data.branches);
        if (!province) setProvinces(data.provinces);
        setDistricts(data.districts);
      } catch {
        // Keep stale data on error.
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Re-fetch whenever province or district filter changes (immediate).
  useEffect(() => {
    fetchBranches(selectedProvince, selectedDistrict, search);
  }, [selectedProvince, selectedDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input.
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchBranches(selectedProvince, selectedDistrict, value);
    }, 400);
  };

  const handleProvinceSelect = (province: string | null) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
  };

  const hasActiveFilters = selectedProvince || selectedDistrict || search;

  const clearAll = () => {
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSearch("");
    fetchBranches(null, null, "");
  };

  return (
    <div className="min-h-screen bg-[#080705] text-[#fff7e9]">
      <header className="sticky top-0 z-30 border-b border-[#f1dcc4]/10 bg-[#080705]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-sm font-semibold text-[#fff7e9]">
            <Image
              src="/brand/coorder-wordmark.svg"
              alt="CoOrder.ai"
              width={106}
              height={24}
              priority
            />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#f1dcc4]/12 px-3 py-2 text-xs text-[#c9b7a0]">
            <span className="h-2 w-2 rounded-full bg-[#78c47b]" />
            {t("page.verified_network")}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(200,121,63,0.18),transparent_28%),radial-gradient(circle_at_76%_12%,rgba(117,148,94,0.16),transparent_26%)]" />
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d18a4e]">
                <Sparkles className="h-4 w-4" />
                {t("page.eyebrow")}
              </p>
              <h1 className="max-w-2xl text-balance text-5xl font-semibold leading-[0.96] sm:text-6xl">
                {t("page.heading")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#c9b7a0]">
                {t("page.subheading")}
              </p>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.55 }}
              className="rounded-lg border border-[#f1dcc4]/12 bg-[#14100b] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.38)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#fff7e9]">
                  <SlidersHorizontal className="h-4 w-4 text-[#d18a4e]" />
                  {t("filters.title")}
                </span>
                <span className="text-xs text-[#8f806e]">
                  {t("results_count", { count: branches.length })}
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f806e]" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t("search.placeholder")}
                  className="h-12 rounded-lg border-[#f1dcc4]/14 bg-[#080705] pl-9 pr-9 text-[#fff7e9] placeholder:text-[#7f715e] focus-visible:ring-[#d18a4e]"
                />
                {search && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f806e] transition-colors hover:text-[#fff7e9]"
                    aria-label={t("search.clear")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {provinces.length > 0 && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => handleProvinceSelect(null)}
                    className={`h-9 flex-shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${
                      !selectedProvince
                        ? "border-[#c8793f] bg-[#c8793f] text-white"
                        : "border-[#f1dcc4]/12 bg-[#fff7e9]/5 text-[#c9b7a0] hover:border-[#d18a4e]/60"
                    }`}
                  >
                    {t("filters.all_provinces")}
                  </button>
                  {provinces.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleProvinceSelect(p)}
                      className={`h-9 flex-shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${
                        selectedProvince === p
                          ? "border-[#c8793f] bg-[#c8793f] text-white"
                          : "border-[#f1dcc4]/12 bg-[#fff7e9]/5 text-[#c9b7a0] hover:border-[#d18a4e]/60"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {selectedProvince && districts.length > 0 && (
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#8f806e]" />
                  <button
                    onClick={() => setSelectedDistrict(null)}
                    className={`h-8 flex-shrink-0 rounded-md border px-3 text-[11px] font-medium transition-colors ${
                      !selectedDistrict
                        ? "border-[#75945e] bg-[#75945e] text-white"
                        : "border-[#f1dcc4]/12 bg-[#fff7e9]/5 text-[#c9b7a0] hover:border-[#75945e]/60"
                    }`}
                  >
                    {t("filters.all_districts")}
                  </button>
                  {districts.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDistrict(d)}
                      className={`h-8 flex-shrink-0 rounded-md border px-3 text-[11px] font-medium transition-colors ${
                        selectedDistrict === d
                          ? "border-[#75945e] bg-[#75945e] text-white"
                          : "border-[#f1dcc4]/12 bg-[#fff7e9]/5 text-[#c9b7a0] hover:border-[#75945e]/60"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <div className="mb-5 flex items-center justify-between">
          <p className="inline-flex items-center gap-2 text-sm text-[#c9b7a0]">
            <Store className="h-4 w-4 text-[#d18a4e]" />
            {isLoading
              ? t("loading")
              : t("results_count", { count: branches.length })}
          </p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 gap-1 px-2 text-xs text-[#c9b7a0] hover:bg-[#fff7e9]/8 hover:text-[#fff7e9]"
            >
              <X className="h-3 w-3" />
              {t("filters.clear_filters")}
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-lg border border-[#f1dcc4]/12 bg-[#14100b]"
              >
                <div className="h-40 bg-[#211910]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#211910]" />
                  <div className="h-3 w-1/2 rounded bg-[#211910]" />
                  <div className="h-3 w-5/6 rounded bg-[#211910]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && branches.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-[#f1dcc4]/12 bg-[#14100b] px-5 py-20 text-center">
            <MapPin className="mb-4 h-10 w-10 text-[#d18a4e]" />
            <h3 className="mb-1 text-lg font-semibold text-[#fff7e9]">
              {t("empty.title")}
            </h3>
            <p className="mb-4 text-sm text-[#c9b7a0]">
              {t("empty.description")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                {t("empty.clear_filters")}
              </Button>
            )}
          </div>
        )}

        {!isLoading && branches.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.25) }}
              >
                <RestaurantCard
                  branch={branch}
                  locale={locale}
                  host={host}
                  priorityImage={index < 3}
                />
              </motion.div>
            ))}
          </div>
        )}
        </section>
      </main>
    </div>
  );
}
