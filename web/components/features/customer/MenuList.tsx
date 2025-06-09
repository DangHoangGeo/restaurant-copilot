"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { FoodCard, FoodItem } from "./FoodCard";
import { getLocalizedText } from "./utils";
import type { ViewType, ViewProps } from "./screens/types";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Search, Grid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  position: number;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: FoodItem[];
}

interface Props {
  categories: Category[];
  searchPlaceholder: string;
  locale: string;
  addToCart: (item: FoodItem) => void;
  updateQty?: (id: string, qty: number) => void;
  getQty: (id: string) => number;
  brandColor: string;
  recommended?: FoodItem[];
  canAddItems?: boolean;
  setView: (view: ViewType, props?: ViewProps) => void;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
}

type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "popular";
type ViewMode = "grid" | "list";

export function MenuList({
  categories,
  searchPlaceholder,
  locale,
  addToCart,
  updateQty,
  getQty,
  brandColor,
  recommended = [],
  canAddItems = true,
  setView,
  tableId,
  sessionId,
  tableNumber,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const t = useTranslations("Customer");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();

  const mealContext = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 15) return "lunch";
    if (hour >= 17 && hour < 22) return "dinner";
    return "other";
  }, []);

  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  // All available items for search
  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.menu_items
        .filter((item) => item.available && item.weekday_visibility.includes(today))
        .map((item) => ({ ...item, categoryId: cat.id, categoryName: getLocalizedText(cat as unknown as Record<string, unknown>, locale) }))
    );
  }, [categories, locale, today]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let items = allItems;

    // Apply search filter
    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase();
      items = items.filter((item) => {
        const text = getLocalizedText(item as unknown as Record<string, unknown>, locale).toLowerCase();
        const description = (item.description_en || item.description_ja || item.description_vi || "").toLowerCase();
        return text.includes(keyword) || description.includes(keyword) || item.categoryName.toLowerCase().includes(keyword);
      });
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      items = items.filter((item) => item.categoryId === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case "price_asc":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        items.sort((a, b) => b.price - a.price);
        break;
      case "name_asc":
        items.sort((a, b) => 
          getLocalizedText(a as unknown as Record<string, unknown>, locale)
            .localeCompare(getLocalizedText(b as unknown as Record<string, unknown>, locale))
        );
        break;
      case "popular":
        items.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      default:
        // Keep original order with smart contextual sorting
        items.sort((a, b) => {
          const score = (item: typeof items[0]) => {
            const name = getLocalizedText(item as unknown as Record<string, unknown>, locale).toLowerCase();
            let s = 0;
            if (isWeekend && /dessert|drink|share/.test(name)) s += 5;
            if (mealContext === "breakfast" && /breakfast|coffee|bakery/.test(name)) s += 4;
            if (mealContext === "lunch" && /lunch|quick/.test(name)) s += 4;
            if (mealContext === "dinner" && /dinner|meal|main/.test(name)) s += 4;
            return s;
          };
          return score(b) - score(a);
        });
    }

    return items;
  }, [allItems, searchTerm, selectedCategory, sortBy, locale, mealContext, isWeekend]);

  // Group filtered items by category for display
  const filteredCategories = useMemo(() => {
    if (searchTerm.trim() || selectedCategory !== "all") {
      // When searching or filtering, group results by category
      const categoryMap = new Map<string, typeof filteredAndSortedItems>();
      
      filteredAndSortedItems.forEach((item) => {
        if (!categoryMap.has(item.categoryId)) {
          categoryMap.set(item.categoryId, []);
        }
        categoryMap.get(item.categoryId)!.push(item);
      });

      return categories
        .filter((cat) => categoryMap.has(cat.id))
        .map((cat) => ({
          ...cat,
          menu_items: categoryMap.get(cat.id) || [],
        }));
    }
    
    // Default view - show all categories with their items
    return categories.map((cat) => ({
      ...cat,
      menu_items: cat.menu_items.filter((item) => 
        item.available && item.weekday_visibility.includes(today)
      ),
    })).filter((cat) => cat.menu_items.length > 0);
  }, [categories, filteredAndSortedItems, searchTerm, selectedCategory, today]);

  const popularItems = useMemo(() => {
    const items = categories.flatMap((c) => c.menu_items);
    return items
      .filter((i) => i.available && i.weekday_visibility.includes(today))
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 5);
  }, [categories, today]);

  const handleAddToCart = (item: FoodItem) => {
    if (canAddItems) {
      addToCart(item);
    }
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (canAddItems && updateQty) {
      updateQty(id, qty);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setIsSearchExpanded(false);
  };

  const handleSearchFocus = () => {
    setIsSearchExpanded(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        if (!searchTerm.trim()) {
          setIsSearchExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm]);

  // Enhanced category options including "All"
  const categoryOptions = [
    { id: "all", name_en: "All Items", name_ja: "すべて", name_vi: "Tất cả" },
    ...categories,
  ];

  const hasActiveFilters = searchTerm.trim() || selectedCategory !== "all" || sortBy !== "default";

  return (
    <div className="relative">
      {/* Enhanced Search and Filter Bar */}
      <div className="sticky top-0 z-40 mb-6">
        <div className="p-4 space-y-3  bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm rounded-lg">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-8 py-2 w-full rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm.length > 0 && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter and View Toggle Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Category Filter - Mobile Optimized */}
            <div className="flex-1 min-w-0">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {getLocalizedText(
                        {
                          name_en: category.name_en,
                          name_vi: category.name_vi,
                          name_ja: category.name_ja,
                        },
                        locale
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle - Compact for Mobile */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm.trim() || selectedCategory !== "all") && (
            <div className="flex flex-wrap gap-2">
              {searchTerm.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  Search: &quot;{searchTerm}&quot;
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded-full">
                  Category: {categories.find(c => c.id === selectedCategory)?.name_en || "Unknown"}
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Popular Items Section */}
      {!hasActiveFilters && popularItems.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
          aria-label="popular"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span style={{ color: brandColor }}>🔥</span>
            {t("menu.popular_now")}
          </h2>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {popularItems.map((item) => (
              <div key={item.id} className="w-48 flex-shrink-0">
                <motion.div whileTap={canAddItems ? { scale: 0.95 } : {}}>
                  <FoodCard
                    item={item}
                    qtyInCart={getQty(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                    setView={setView}
                    tableId={tableId}
                    sessionId={sessionId}
                    tableNumber={tableNumber}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Recommended Items Section */}
      {!hasActiveFilters && recommended.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
          aria-label="recommended"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span style={{ color: brandColor }}>✨</span>
            {t("menu.recommended")}
          </h2>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommended.map((item) => (
              <div key={item.id} className="w-48 flex-shrink-0">
                <motion.div whileTap={canAddItems ? { scale: 0.95 } : {}}>
                  <FoodCard
                    item={item}
                    qtyInCart={getQty(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                    setView={setView}
                    tableId={tableId}
                    sessionId={sessionId}
                    tableNumber={tableNumber}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'} found
        </div>
      )}

      {/* Menu Categories and Items */}
      <AnimatePresence mode="wait">
        {filteredCategories.length > 0 ? (
          <motion.div
            key="menu-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {filteredCategories.map((cat, categoryIndex) => (
              <motion.section
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="scroll-mt-24"
                id={`category-${cat.id}`}
              >
                <h3
                  className="text-xl font-semibold mb-4 pb-2 border-b-2 border-opacity-30"
                  style={{ color: brandColor, borderColor: brandColor }}
                >
                  {getLocalizedText(cat as unknown as Record<string, unknown>, locale)}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({cat.menu_items.length})
                  </span>
                </h3>
                
                <div className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-3"
                }>
                  {cat.menu_items.map((item, itemIndex) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: itemIndex * 0.05 }}
                      className={viewMode === "list" ? "w-full" : ""}
                    >
                      <motion.div whileTap={canAddItems ? { scale: 0.98 } : {}}>
                        <FoodCard
                          item={item}
                          qtyInCart={getQty(item.id)}
                          onAdd={() => handleAddToCart(item)}
                          onDecrease={() => handleUpdateQuantity(item.id, getQty(item.id) - 1)}
                          onIncrease={() => handleUpdateQuantity(item.id, getQty(item.id) + 1)}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          setView={setView}
                          tableId={tableId}
                          sessionId={sessionId}
                          tableNumber={tableNumber}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No items found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Try adjusting your search or filters
            </p>
            <Button onClick={clearSearch} variant="outline">
              Clear filters
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
