"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestaurantCard } from "./RestaurantCard";
import type { DiscoverBranch, DiscoverApiResponse } from "@/shared/types/discover";

interface Props {
  initialData: DiscoverApiResponse;
  locale: string;
}

export function DiscoverPageClient({ initialData, locale }: Props) {
  const t = useTranslations("discover");

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t("page.heading")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("page.subheading")}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("search.placeholder")}
              className="pl-9 pr-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t("search.clear")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Province Filter Pills */}
          {provinces.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleProvinceSelect(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !selectedProvince
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400"
                }`}
              >
                {t("filters.all_provinces")}
              </button>
              {provinces.map((p) => (
                <button
                  key={p}
                  onClick={() => handleProvinceSelect(p)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedProvince === p
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* District sub-filter (only when province selected and districts exist) */}
          {selectedProvince && districts.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <button
                onClick={() => setSelectedDistrict(null)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  !selectedDistrict
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                }`}
              >
                {t("filters.all_districts")}
              </button>
              {districts.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDistrict(d)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    selectedDistrict === d
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Result count + clear */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isLoading
              ? t("loading")
              : t("results_count", { count: branches.length })}
          </p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-slate-500 hover:text-slate-700 h-7 px-2 gap-1"
            >
              <X className="h-3 w-3" />
              {t("filters.clear_filters")}
            </Button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse"
              >
                <div className="h-40 bg-slate-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && branches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("empty.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {t("empty.description")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                {t("empty.clear_filters")}
              </Button>
            )}
          </div>
        )}

        {/* Restaurant Grid */}
        {!isLoading && branches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => (
              <RestaurantCard key={branch.id} branch={branch} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
