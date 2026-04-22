"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  Suspense,
  useEffect,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clock,
  TrendingUp,
  Sparkles,
  ChefHat,
  ArrowRight,
  Heart,
  RefreshCw,
  UtensilsCrossed,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { getLocalizedText } from "@/lib/customerUtils";
import { generateContextualInfo } from "@/components/common/ContextualGreeting";
import { ItemDetailModal } from "@/components/features/customer/menu/ItemDetailModal";
import {
  SmartMenuSkeleton,
  MenuCardSkeleton,
} from "@/components/ui/enhanced-skeleton";
import { useCart } from "@/components/features/customer/CartContext";
import { useMenuData } from "@/hooks/useMenuData";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useSessionData } from "@/hooks/useSessionData";
import type {
  Category,
  FoodItem,
  MenuItemSize,
  Topping,
} from "@/shared/types/menu";
import type {
  ViewType,
  ViewProps,
} from "@/components/features/customer/screens/types";
import { CompactFoodCard } from "./CompactFoodCard";
import { MenuSection } from "./MenuSection";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useToast } from "@/components/ui/use-toast";

// Enhanced interfaces for smart features
interface SmartMenuItem extends FoodItem {
  categoryId: string;
  categoryName: string;
  searchText: string;
  rating?: number;
  reviewCount?: number;
  isPopular?: boolean;
  isNew?: boolean;
  tags?: string[];
  contextScore?: number;
  estimatedPrepTime?: number;
  calories?: number;
  isRecommended?: boolean;
  recommendationReason?: string;
}

interface SmartCategory {
  id: string;
  name: string;
  items: SmartMenuItem[];
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  description?: string;
  count: number;
}

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const normalizedHash = (value: string, salt: string): number => {
  const hash = hashString(`${value}:${salt}`);
  return hash / 0xffffffff;
};

interface SmartMenuProps {
  categories?: Category[]; // Optional fallback data
  onAddToCart?: (item: SmartMenuItem) => void;
  searchPlaceholder?: string;
  locale: string;
  brandColor: string;
  canAddItems: boolean;
  setView: (view: ViewType, props?: ViewProps) => void;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  restaurantName?: string;
  branchName?: string;
  restaurantId?: string;
  logoUrl?: string | null;
  allowOrderNotes?: boolean;
}

// Helper function to get time of day classification
const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "dinner";
  return "late";
};

// Transform categories into enhanced smart menu items
const transformToSmartMenuItems = (
  categories: Category[],
  locale: string,
  recommendedItems: string[] = [],
  recommendationReasons: Record<string, string> = {},
): SmartMenuItem[] => {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return categories.flatMap((category) =>
    category.menu_items
      .filter(
        (item) => item.available && item.weekday_visibility.includes(today),
      )
      .map((item): SmartMenuItem => {
        const isRecommended = recommendedItems.includes(item.id);
        const stableSeed =
          item.id || item.name_en || `${category.id}-${item.position}`;
        const rating = 4 + normalizedHash(stableSeed, "rating");
        const reviewCount =
          5 + Math.floor(normalizedHash(stableSeed, "reviews") * 50);
        const estimatedPrepTime =
          5 + Math.floor(normalizedHash(stableSeed, "prep") * 20);
        const calories =
          200 + Math.floor(normalizedHash(stableSeed, "calories") * 400);

        return {
          ...item,
          categoryId: category.id,
          categoryName: getLocalizedText(
            {
              name_en: category.name_en || "",
              name_ja: category.name_ja || "",
              name_vi: category.name_vi || "",
            },
            locale,
          ),
          searchText: `${getLocalizedText(
            {
              name_en: item.name_en || "",
              name_ja: item.name_ja || "",
              name_vi: item.name_vi || "",
            },
            locale,
          )} ${item.description_en || ""} ${item.description_ja || ""} ${item.description_vi || ""}`.toLowerCase(),
          rating,
          reviewCount,
          isPopular: normalizedHash(stableSeed, "popular") > 0.7,
          isNew: normalizedHash(stableSeed, "new") > 0.9,
          tags: item.tags || [],
          estimatedPrepTime,
          calories,
          isRecommended,
          recommendationReason: isRecommended
            ? recommendationReasons[item.id]
            : undefined,
        };
      }),
  );
};

export function SmartMenu({
  categories: fallbackCategories = [],
  onAddToCart,
  searchPlaceholder = "Search menu items...",
  locale,
  brandColor,
  canAddItems,
  setView,
  tableId,
  sessionId,
  tableNumber,
  restaurantName = "Our Restaurant",
  branchName,
  restaurantId,
  logoUrl,
  allowOrderNotes = true,
}: SmartMenuProps) {
  const { addToCart, getQuantityByItemId, cart } = useCart();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState(locale);

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [activeSmartCategory, setActiveSmartCategory] = useState<string>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    string | null
  >(null);
  // const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SmartMenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const t = useTranslations("common");
  const tMenu = useTranslations("customer.menu");
  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemDetailRequestRef = useRef(0);

  // Data fetching hooks
  const {
    categories: fetchedCategories,
    isLoading: menuLoading,
    isError: menuError,
    prefetchItemDetails,
    getItemDetails,
    refetch: refetchMenu,
  } = useMenuData({
    restaurantId,
    locale,
    sessionId,
    tableId,
  });

  const { sessionData } = useSessionData({
    sessionId,
    tableId,
    restaurantId,
  });

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const cartItems = useMemo(
    () => cart.map((item: { itemId: string }) => item.itemId),
    [cart],
  );

  // Use fetched data or fallback
  const activeCategories =
    fetchedCategories.length > 0 ? fetchedCategories : fallbackCategories;

  // Prepare menu items for recommendations
  const availableMenuItems = useMemo(() => {
    return activeCategories.flatMap((category) =>
      category.menu_items
        .filter((item) => item.available)
        .map((item) => ({
          id: item.id,
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi,
          description_en: item.description_en || undefined,
          description_ja: item.description_ja || undefined,
          description_vi: item.description_vi || undefined,
          categoryId: category.id,
        })),
    );
  }, [activeCategories]);

  const {
    recommendedItems,
    recommendationReasons,
    isLoading: recommendationsLoading,
  } = useRecommendations({
    sessionId,
    tableId,
    timeOfDay,
    currentCartItems: cartItems,
    previousOrders: sessionData?.orderHistory || [],
    restaurantId,
    availableMenuItems,
  });

  // Generate contextual information
  const contextualInfo = useMemo(() => {
    return generateContextualInfo(restaurantName, locale);
  }, [restaurantName, locale]);

  // Transform categories into smart menu items
  const allMenuItems = useMemo((): SmartMenuItem[] => {
    return transformToSmartMenuItems(
      activeCategories,
      locale,
      recommendedItems,
      recommendationReasons,
    );
  }, [activeCategories, locale, recommendedItems, recommendationReasons]);

  // Smart categorization logic with enhanced algorithms
  const smartCategories = useMemo((): Record<string, SmartCategory> => {
    const popularItems = allMenuItems
      .filter((item) => item.reviewCount && item.reviewCount > 10)
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 8);

    const recommendedItemsData = allMenuItems
      .filter((item) => item.isRecommended)
      .slice(0, 8);

    const timeBasedKeywords = {
      breakfast: [
        "coffee",
        "tea",
        "pastry",
        "egg",
        "toast",
        "pancake",
        "cereal",
        "morning",
      ],
      lunch: ["sandwich", "salad", "soup", "bowl", "wrap", "burger", "quick"],
      afternoon: ["snack", "light", "tea", "coffee", "sweet"],
      dinner: ["main", "pasta", "rice", "meat", "fish", "steak", "dinner"],
      late: ["snack", "light", "drink", "dessert", "simple"],
    };

    const keywords =
      timeBasedKeywords[timeOfDay as keyof typeof timeBasedKeywords] || [];
    const timeBasedItems = allMenuItems
      .filter((item) =>
        keywords.some((keyword) =>
          item.searchText.toLowerCase().includes(keyword.toLowerCase()),
        ),
      )
      .slice(0, 8);

    return {
      recommended: {
        id: "recommended",
        name: "Perfect for You",
        items: recommendedItemsData,
        icon: Sparkles,
        color: "from-purple-500 to-pink-500",
        description: `AI-curated picks for ${contextualInfo.timeContext.toLowerCase()}`,
        count: recommendedItemsData.length,
      },
      popular: {
        id: "popular",
        name: "Customer Favorites",
        items: popularItems,
        icon: TrendingUp,
        color: "from-orange-500 to-red-500",
        description: "Most loved by our customers",
        count: popularItems.length,
      },
      [timeOfDay]: {
        id: timeOfDay,
        name: `Perfect for ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`,
        items: timeBasedItems,
        icon:
          timeOfDay === "breakfast"
            ? ChefHat
            : timeOfDay === "lunch"
              ? Clock
              : Heart,
        color:
          timeOfDay === "breakfast"
            ? "from-yellow-500 to-orange-500"
            : timeOfDay === "lunch"
              ? "from-green-500 to-blue-500"
              : "from-blue-500 to-purple-500",
        description: `Ideal choices for your ${timeOfDay} cravings`,
        count: timeBasedItems.length,
      },
    };
  }, [allMenuItems, contextualInfo.timeContext, timeOfDay]);

  // Filtered items based on search, category, and active smart category
  const filteredItems = useMemo(() => {
    let items = allMenuItems;
    // apply selected category filter first
    if (activeCategoryFilter) {
      items = items.filter((item) => item.categoryId === activeCategoryFilter);
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      items = items.filter((item) =>
        item.searchText.includes(debouncedSearchTerm.toLowerCase()),
      );
    }

    // Apply smart category filter
    if (activeSmartCategory && activeSmartCategory !== "all") {
      const categoryItems = smartCategories[activeSmartCategory]?.items || [];
      items = debouncedSearchTerm ? items : categoryItems;
    }

    return items;
  }, [
    allMenuItems,
    debouncedSearchTerm,
    activeSmartCategory,
    smartCategories,
    activeCategoryFilter,
  ]);

  // Optimized event handlers
  const mergeItemDetails = useCallback(
    (
      item: SmartMenuItem,
      fullItem: Awaited<ReturnType<typeof getItemDetails>>,
    ): SmartMenuItem =>
      ({
        ...item,
        ...fullItem,
        menu_item_sizes: fullItem.menu_item_sizes || [],
        toppings: fullItem.toppings || [],
      }) as SmartMenuItem,
    [],
  );

  const showItemDetailsError = useCallback(() => {
    toast({
      title: tMenu("item_load_error_title"),
      description: tMenu("item_load_error_description"),
      variant: "destructive",
    });
  }, [tMenu, toast]);

  const handleItemClick = useCallback(
    async (item: FoodItem) => {
      const smartItem = item as SmartMenuItem;
      const requestId = itemDetailRequestRef.current + 1;
      itemDetailRequestRef.current = requestId;

      try {
        const fullItem = await getItemDetails(item.id);
        if (itemDetailRequestRef.current !== requestId) {
          return;
        }

        setSelectedItem(mergeItemDetails(smartItem, fullItem));
        setIsItemModalOpen(true);
      } catch (error) {
        console.error("Failed to load full item details:", error);
        if (itemDetailRequestRef.current !== requestId) {
          return;
        }

        showItemDetailsError();
      }
    },
    [getItemDetails, mergeItemDetails, showItemDetailsError],
  );

  const handleModalClose = useCallback(() => {
    itemDetailRequestRef.current += 1;
    setIsItemModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleModalAddToCart = useCallback(
    (
      item: FoodItem,
      quantity: number,
      selectedSize?: MenuItemSize,
      selectedToppings?: Topping[],
      notes?: string,
    ) => {
      console.log("Adding to cart:", {
        item: item.id,
        quantity,
        selectedSize,
        selectedToppings,
        notes,
      });

      // Use the cart context's addToCart function which properly handles size, toppings, and notes
      addToCart(
        item as SmartMenuItem,
        quantity,
        selectedSize,
        selectedToppings,
        notes,
      );
    },
    [addToCart],
  );

  const handleItemHover = useCallback(
    async (itemId: string) => {
      // Prefetch item details for faster loading
      await prefetchItemDetails(itemId);
    },
    [prefetchItemDetails],
  );

  const handleAddToCart = useCallback(
    (item: SmartMenuItem) => {
      if (!canAddItems) return;

      const addSimpleItem = () => {
        if (onAddToCart) {
          onAddToCart(item);
        } else {
          addToCart(item, 1);
        }
      };

      if (
        (item.menu_item_sizes?.length ?? 0) > 0 ||
        (item.toppings?.length ?? 0) > 0
      ) {
        void handleItemClick(item);
        return;
      }

      const requestId = itemDetailRequestRef.current + 1;
      itemDetailRequestRef.current = requestId;

      void getItemDetails(item.id)
        .then((fullItem) => {
          if (itemDetailRequestRef.current !== requestId) {
            return;
          }

          const hasCustomizations =
            (fullItem.menu_item_sizes?.length ?? 0) > 0 ||
            (fullItem.toppings?.length ?? 0) > 0;

          if (hasCustomizations) {
            setSelectedItem(mergeItemDetails(item, fullItem));
            setIsItemModalOpen(true);
            return;
          }

          addSimpleItem();
        })
        .catch((error) => {
          console.error("Failed to load item details before add:", error);
          if (itemDetailRequestRef.current !== requestId) {
            return;
          }

          showItemDetailsError();
        });
    },
    [
      canAddItems,
      onAddToCart,
      addToCart,
      handleItemClick,
      getItemDetails,
      mergeItemDetails,
      showItemDetailsError,
    ],
  );

  // Get smart category display order
  const smartCategoryOrder = useMemo(() => {
    return ["recommended", "popular", timeOfDay].filter(
      (key) => smartCategories[key] && smartCategories[key].count > 0,
    );
  }, [smartCategories, timeOfDay]);

  // Apply restaurant brand color
  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--brand-color", brandColor);
    }
  }, [brandColor]);

  // Auto-switch to recommended when recommendations load (only if user hasn't interacted)
  useEffect(() => {
    if (
      !hasUserInteracted &&
      !recommendationsLoading &&
      recommendedItems.length > 0 &&
      activeSmartCategory === "all"
    ) {
      setActiveSmartCategory("recommended");
    }
  }, [
    recommendationsLoading,
    recommendedItems.length,
    hasUserInteracted,
    activeSmartCategory,
  ]);

  // Loading states
  const isLoading = menuLoading;

  if (isLoading) {
    return <SmartMenuSkeleton />;
  }

  if (menuError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">
            {t("menu.failed_to_load_menu")}
          </div>
          <Button onClick={() => refetchMenu()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Restaurant Hero Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: brandColor
            ? `linear-gradient(150deg, ${brandColor} 0%, ${brandColor}e0 55%, ${brandColor}a0 100%)`
            : "linear-gradient(150deg, #0891b2 0%, #0e7490 55%, #155e75 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10"
          style={{ filter: "blur(28px)" }}
        />
        <div
          className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full bg-white/10"
          style={{ filter: "blur(22px)" }}
        />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* ── Action bar: language / theme / history ── */}
        <div
          className="relative z-10 flex items-center justify-end gap-1 px-3"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 10px)" }}
        >
          {sessionId && (
            <button
              onClick={() =>
                setView("history", { tableId, sessionId, tableNumber })
              }
<<<<<<< HEAD
              className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              aria-label={t("order_history_label")}
=======
              className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              aria-label="Order history"
>>>>>>> 95683bf (refactor: Update UI components for improved layout and styling consistency)
            >
              <Clock className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label={
              theme === "dark"
                ? t("switch_to_light_mode")
                : t("switch_to_dark_mode")
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <div className="[&_button]:text-white [&_button]:hover:bg-white/20 [&_button]:h-10 [&_button]:rounded-full [&_button]:bg-white/15">
            <LanguageSwitcher
              currentLocale={selectedLocale}
              onLocaleChange={setSelectedLocale}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="relative px-4 pt-2 pb-8">
          <div className="flex items-center gap-3">
            {/* Logo or initial */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex-shrink-0"
            >
              {logoUrl ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/40 shadow-xl">
                  <Image
                    src={logoUrl}
                    alt={restaurantName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 border-2 border-white/30 shadow-xl flex items-center justify-center">
                  <UtensilsCrossed className="h-6 w-6 text-white/80" />
                </div>
              )}
            </motion.div>

            {/* Restaurant name + branch */}
            <div className="flex-1 min-w-0">
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-bold text-white text-lg leading-tight truncate"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
              >
                {restaurantName}
              </motion.h1>
              {branchName && branchName !== restaurantName && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.16 }}
                  className="inline-flex items-center rounded-full bg-white/18 px-2 py-0.5 text-xs font-medium text-white/90 mt-0.5"
                >
                  {branchName}
                </motion.span>
              )}
            </div>

            {/* Table badge */}
            {tableNumber && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 }}
                className="flex-shrink-0 bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 text-center shadow-md backdrop-blur-sm"
              >
                <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium leading-none">
                  Table
                </p>
                <p className="text-white font-bold text-lg leading-none mt-0.5">
                  {tableNumber}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Wave bottom divider */}
        <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden">
          <svg
            viewBox="0 0 1440 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 24L80 20C160 16 320 8 480 6C640 4 800 8 960 12C1120 16 1280 20 1360 22L1440 24V24H1360C1280 24 1120 24 960 24C800 24 640 24 480 24C320 24 160 24 80 24H0Z"
              className="fill-slate-50 dark:fill-slate-900"
            />
          </svg>
        </div>
      </div>

      {/* ── Sticky search + category bar ── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        {/* Search bar */}
        <div className="px-4 pt-3 pb-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-12 w-full h-11 text-base rounded-xl border border-gray-200 dark:border-slate-700 focus:border-[var(--brand-color)] transition-colors bg-slate-50 dark:bg-slate-800"
            />
            {searchTerm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-y-0 right-3 flex items-center"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-6 w-6 p-0 rounded-full"
                >
                  ×
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Category pills */}
        {activeCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border focus:outline-none"
              style={
                !activeCategoryFilter
                  ? {
                      backgroundColor: brandColor,
                      borderColor: brandColor,
                      color: "#fff",
                    }
                  : {
                      backgroundColor: "transparent",
                      borderColor: "#e2e8f0",
                      color: "#64748b",
                    }
              }
            >
              {t("menu.show_all_categories")}
            </button>
            {activeCategories.map((cat) => {
              const label = getLocalizedText(
                {
                  name_en: cat.name_en || "",
                  name_ja: cat.name_ja || "",
                  name_vi: cat.name_vi || "",
                },
                locale,
              );
              const isActive = activeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setActiveCategoryFilter(isActive ? null : cat.id)
                  }
                  className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border focus:outline-none"
                  style={
                    isActive
                      ? {
                          backgroundColor: brandColor,
                          borderColor: brandColor,
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: "#e2e8f0",
                          color: "#64748b",
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="container mx-auto px-4 py-4">
        {/* Smart Category Tabs - Hidden when not searching */}
        {debouncedSearchTerm && (
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={activeSmartCategory === "all" ? "default" : "outline"}
                onClick={() => {
                  setActiveSmartCategory("all");
                  setHasUserInteracted(true);
                }}
                className={`flex-shrink-0 ${
                  activeSmartCategory === "all"
                    ? "text-white font-medium border-0"
                    : ""
                }`}
                style={{
                  whiteSpace: "nowrap",
                  ...(activeSmartCategory === "all"
                    ? {
                        backgroundColor: "var(--brand-color)",
                        color: "white",
                        borderColor: "var(--brand-color)",
                      }
                    : {}),
                }}
              >
                {t("menu.all_items")}
              </Button>
              {smartCategoryOrder.map((categoryKey) => {
                const category = smartCategories[categoryKey];
                const IconComponent = category.icon || Sparkles;
                const isActive = activeSmartCategory === categoryKey;

                return (
                  <Button
                    key={categoryKey}
                    variant={isActive ? "default" : "outline"}
                    onClick={() => {
                      setActiveSmartCategory(categoryKey);
                      setHasUserInteracted(true);
                    }}
                    className={`flex-shrink-0 flex items-center gap-2 ${
                      isActive ? "text-white font-medium border-0" : ""
                    }`}
                    style={{
                      whiteSpace: "nowrap",
                      ...(isActive
                        ? {
                            backgroundColor: "var(--brand-color)",
                            color: "white",
                            borderColor: "var(--brand-color)",
                          }
                        : {}),
                    }}
                  >
                    <IconComponent
                      className={`h-4 w-4 ${isActive ? "text-white" : ""}`}
                    />
                    {category.name}
                    <Badge
                      variant={isActive ? "outline" : "secondary"}
                      className={`ml-1 text-xs ${
                        isActive ? "bg-white/20 text-white border-white/30" : ""
                      }`}
                    >
                      {category.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {/* Category Description */}
            {activeSmartCategory &&
              activeSmartCategory !== "all" &&
              smartCategories[activeSmartCategory] && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-gray-600 mt-2 text-center"
                >
                  {smartCategories[activeSmartCategory].description}
                </motion.p>
              )}
          </div>
        )}

        {/* Sectioned Menu Layout - Mobile First Food App Style */}
        <Suspense fallback={<MenuCardSkeleton count={9} />}>
          <AnimatePresence mode="wait">
            {/* If search is active, show all items in a consistent grid */}
            {debouncedSearchTerm ? (
              <motion.div
                key={`search-${debouncedSearchTerm}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-4"
              >
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        onHoverStart={() => handleItemHover(item.id)}
                      >
                        <CompactFoodCard
                          item={item}
                          qtyInCart={getQuantityByItemId(item.id)}
                          onAdd={() => handleAddToCart(item)}
                          onCardClick={() => handleItemClick(item)}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          showBadge={false}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-gray-400 mb-4">
                      <Search className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("menu.no_items_found")}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t("menu.try_adjusting_search")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setActiveSmartCategory("recommended");
                      }}
                    >
                      {t("menu.clear_filters")}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Sectioned layout when not searching - optimized spacing for mobile */
              <div className="space-y-6">
                {/* Show filtered content when category filter is active */}
                {activeCategoryFilter ? (
                  /* Single category view */
                  <MenuSection
                    title={getLocalizedText(
                      {
                        name_en:
                          activeCategories.find(
                            (cat) => cat.id === activeCategoryFilter,
                          )?.name_en || "",
                        name_ja:
                          activeCategories.find(
                            (cat) => cat.id === activeCategoryFilter,
                          )?.name_ja || "",
                        name_vi:
                          activeCategories.find(
                            (cat) => cat.id === activeCategoryFilter,
                          )?.name_vi || "",
                      },
                      locale,
                    )}
                    items={filteredItems}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                    onItemClick={handleItemClick}
                    onAddToCart={handleAddToCart}
                    getQuantity={getQuantityByItemId}
                  />
                ) : (
                  /* Normal sectioned view */
                  <>
                    {/* Popular Section */}
                    {smartCategories.popular &&
                      smartCategories.popular.count > 0 && (
                        <MenuSection
                          title={t("menu.popular")}
                          description={t("menu.popular_description")}
                          items={smartCategories.popular.items}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          onItemClick={handleItemClick}
                          onAddToCart={handleAddToCart}
                          getQuantity={getQuantityByItemId}
                          showPopularBadge={true}
                          icon={<TrendingUp className="h-5 w-5" />}
                        />
                      )}

                    {/* Recommended Section */}
                    {smartCategories.recommended &&
                      smartCategories.recommended.count > 0 && (
                        <MenuSection
                          title={t("menu.perfect_for_you")}
                          description={t("menu.perfect_for_you_description")}
                          items={smartCategories.recommended.items}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          onItemClick={handleItemClick}
                          onAddToCart={handleAddToCart}
                          getQuantity={getQuantityByItemId}
                          showRecommendedBadge={true}
                          icon={<Sparkles className="h-5 w-5" />}
                        />
                      )}

                    {/* Regular Categories */}
                    {activeCategories.map((category) => {
                      const categoryItems = allMenuItems.filter(
                        (item) => item.categoryId === category.id,
                      );
                      if (categoryItems.length === 0) return null;

                      return (
                        <MenuSection
                          key={category.id}
                          title={getLocalizedText(
                            {
                              name_en: category.name_en || "",
                              name_ja: category.name_ja || "",
                              name_vi: category.name_vi || "",
                            },
                            locale,
                          )}
                          items={categoryItems}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          onItemClick={handleItemClick}
                          onAddToCart={handleAddToCart}
                          getQuantity={getQuantityByItemId}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </AnimatePresence>
        </Suspense>

        {/* Quick Access Actions */}
        {sessionId && (
          <div className="mt-12 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() =>
                setView("history", { tableId, sessionId, tableNumber })
              }
            >
              {t("view_history")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
        locale={locale}
        brandColor={brandColor}
        companyName={restaurantName}
        branchName={branchName}
        logoUrl={logoUrl}
        onAddToCart={handleModalAddToCart}
        canAddItems={canAddItems}
        showOrderNotes={allowOrderNotes}
      />
    </div>
  );
}
