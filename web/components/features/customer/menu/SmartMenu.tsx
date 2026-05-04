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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clock,
  Moon,
  TrendingUp,
  Sparkles,
  ChefHat,
  Heart,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { getLocalizedText } from "@/lib/customerUtils";
import {
  createCustomerBrandTheme,
  createCustomerThemeProperties,
} from "@/lib/utils/colors";
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
  tags?: string[];
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

interface SmartMenuProps {
  categories?: Category[]; // Optional fallback data
  onAddToCart?: (item: SmartMenuItem) => void;
  searchPlaceholder?: string;
  locale: string;
  brandColor: string;
  currency?: string;
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
  timezone?: string | null;
}

const DEFAULT_CUSTOMER_MENU_TIMEZONE = "Asia/Tokyo";

function getHourInTimezone(timezone?: string | null) {
  const safeTimezone = timezone || DEFAULT_CUSTOMER_MENU_TIMEZONE;

  try {
    const hourPart = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: safeTimezone,
    })
      .formatToParts(new Date())
      .find((part) => part.type === "hour");
    const hour = Number(hourPart?.value);
    return Number.isFinite(hour) ? hour % 24 : new Date().getHours();
  } catch {
    return new Date().getHours();
  }
}

// Helper function to get time of day classification
const getTimeOfDay = (timezone?: string | null): string => {
  const hour = getHourInTimezone(timezone);
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "dinner";
  return "late";
};

type CustomerMenuTone = "light" | "dark";

function getMenuTone(timeOfDay: string): CustomerMenuTone {
  return timeOfDay === "dinner" || timeOfDay === "late" ? "dark" : "light";
}

function getToneProperties(tone: CustomerMenuTone) {
  if (tone === "dark") {
    return {
      "--co-menu-tone": "dark",
      "--co-menu-display-font":
        '"Fraunces", "Cormorant Garamond", "Noto Serif", "Yu Mincho", Georgia, serif',
      "--co-menu-body-font":
        '"Geist", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
      "--co-menu-bg": "#0B0A08",
      "--co-menu-bg-image":
        "linear-gradient(180deg,#12100D 0%,#0B0A08 48%,#080705 100%)",
      "--co-menu-bg-position": "center top",
      "--co-menu-bg-size": "auto",
      "--co-menu-bg-repeat": "no-repeat",
      "--co-menu-hero": "transparent",
      "--co-menu-nav": "rgba(11,10,8,0.82)",
      "--co-menu-text": "#F8EEDB",
      "--co-menu-muted": "#D6C4A6",
      "--co-menu-subtle": "rgba(248,238,219,0.08)",
      "--co-menu-chip": "rgba(248,238,219,0.08)",
      "--co-menu-chip-text": "#F6E8D3",
      "--co-menu-chip-border": "rgba(248,238,219,0.16)",
      "--co-menu-card":
        "linear-gradient(180deg,rgba(23,17,13,0.9) 0%,rgba(12,10,8,0.94) 100%)",
      "--co-menu-card-footer":
        "linear-gradient(180deg,rgba(24,17,12,0.96) 0%,rgba(14,11,8,0.98) 100%)",
      "--co-menu-card-text": "#F8EEDB",
      "--co-menu-card-muted": "#D6C4A6",
      "--co-menu-card-border": "rgba(248,238,219,0.12)",
      "--co-menu-card-shadow": "0 22px 52px -38px rgba(0,0,0,0.9)",
      "--co-menu-price-bg": "rgba(14,12,9,0.58)",
      "--co-menu-price-text": "#F8EEDB",
      "--co-menu-accent": "var(--customer-brand)",
      "--co-menu-accent-strong": "var(--customer-brand-hover)",
      "--co-menu-hanko": "rgba(14,12,9,0.52)",
      "--co-menu-hanko-border": "transparent",
      "--co-menu-hanko-text": "#FFF7E9",
      "--co-menu-count-bg": "rgba(248,238,219,0.11)",
      "--co-menu-count-text": "#F6E8D3",
      "--co-menu-focus-offset": "#0E0C09",
      "--co-cart-bg": "rgba(18,13,9,0.9)",
      "--co-cart-panel-bg": "#120D09",
      "--co-cart-text": "#F8EEDB",
      "--co-cart-muted": "#D6C4A6",
      "--co-cart-border": "rgba(248,238,219,0.16)",
    };
  }

  return {
    "--co-menu-tone": "light",
    "--co-menu-display-font":
      '"Fraunces", "Cormorant Garamond", "Noto Serif", "Yu Mincho", Georgia, serif',
    "--co-menu-body-font":
      '"Geist", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
    "--co-menu-bg": "#F5F4EF",
    "--co-menu-bg-image":
      "linear-gradient(180deg,#FAF9F5 0%,#F5F4EF 48%,#EDEAE3 100%)",
    "--co-menu-bg-position": "center top",
    "--co-menu-bg-size": "auto",
    "--co-menu-bg-repeat": "no-repeat",
    "--co-menu-hero": "transparent",
    "--co-menu-nav": "rgba(245,244,239,0.86)",
    "--co-menu-text": "#211C17",
    "--co-menu-muted": "#6F685E",
    "--co-menu-subtle": "rgba(33,28,23,0.055)",
    "--co-menu-chip": "rgba(255,255,252,0.82)",
    "--co-menu-chip-text": "#2E2821",
    "--co-menu-chip-border": "rgba(33,28,23,0.095)",
    "--co-menu-card": "#FFFFFC",
    "--co-menu-card-footer": "#FFFFFC",
    "--co-menu-card-text": "#211C17",
    "--co-menu-card-muted": "#6F685E",
    "--co-menu-card-border": "rgba(33,28,23,0.095)",
    "--co-menu-card-shadow":
      "0 18px 38px -31px rgba(33,28,23,0.34), 0 1px 0 rgba(255,255,255,0.96) inset",
    "--co-menu-hanko": "rgba(36,23,15,0.56)",
    "--co-menu-hanko-border": "transparent",
    "--co-menu-hanko-text": "#FFF7E9",
    "--co-menu-price-bg": "rgba(255,255,252,0.88)",
    "--co-menu-price-text": "#211C17",
    "--co-menu-accent": "var(--customer-brand)",
    "--co-menu-accent-strong": "var(--customer-brand-hover)",
    "--co-menu-count-bg": "rgba(255,255,252,0.78)",
    "--co-menu-count-text": "#3D352C",
    "--co-menu-focus-offset": "#F5F4EF",
    "--co-cart-bg": "rgba(255,255,252,0.94)",
    "--co-cart-panel-bg": "#FFFFFC",
    "--co-cart-text": "#211C17",
    "--co-cart-muted": "#6F685E",
    "--co-cart-border": "rgba(33,28,23,0.11)",
  };
}

function categoryDomId(categoryId: string) {
  return `menu-category-${categoryId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getRestaurantBusinessDay() {
  return new Date().getDay() === 0 ? 7 : new Date().getDay();
}

function isMenuItemVisibleToday(item: FoodItem, day: number) {
  return item.available && item.weekday_visibility.includes(day);
}

// Transform categories into enhanced smart menu items
const transformToSmartMenuItems = (
  categories: Category[],
  locale: string,
  recommendedItems: string[] = [],
  recommendationReasons: Record<string, string> = {},
): SmartMenuItem[] => {
  const today = getRestaurantBusinessDay();

  return categories.flatMap((category) =>
    category.menu_items
      .filter((item) => isMenuItemVisibleToday(item, today))
      .map((item): SmartMenuItem => {
        const isRecommended = recommendedItems.includes(item.id);

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
          tags: item.tags || [],
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
  currency,
  timezone,
}: SmartMenuProps) {
  const { addToCart, getQuantityByItemId, cart } = useCart();
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("common");
  const tMenu = useTranslations("customer.menu");
  const customerTheme = useMemo(
    () => createCustomerBrandTheme(brandColor),
    [brandColor],
  );
  const customerThemeProperties = useMemo(
    () => createCustomerThemeProperties(customerTheme.primary),
    [customerTheme.primary],
  );
  const safeBrandColor = customerTheme.primary;
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

  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay(timezone));
  const automaticMenuTone = useMemo(() => getMenuTone(timeOfDay), [timeOfDay]);
  const [menuToneOverride, setMenuToneOverride] =
    useState<CustomerMenuTone | null>(null);
  const menuTone = menuToneOverride ?? automaticMenuTone;
  const menuToneProperties = useMemo(
    () => getToneProperties(menuTone),
    [menuTone],
  );
  const toggleMenuTone = useCallback(() => {
    setMenuToneOverride((current) => {
      const activeTone = current ?? automaticMenuTone;
      return activeTone === "dark" ? "light" : "dark";
    });
  }, [automaticMenuTone]);
  const cartItems = useMemo(
    () => cart.map((item: { itemId: string }) => item.itemId),
    [cart],
  );

  // Use fetched data or fallback
  const activeCategories =
    fetchedCategories.length > 0 ? fetchedCategories : fallbackCategories;

  useEffect(() => {
    const updateTimeOfDay = () => {
      setTimeOfDay((current) => {
        const next = getTimeOfDay(timezone);
        return current === next ? current : next;
      });
    };

    updateTimeOfDay();
    const intervalId = window.setInterval(updateTimeOfDay, 60_000);
    return () => window.clearInterval(intervalId);
  }, [timezone]);

  // Prepare menu items for recommendations
  const availableMenuItems = useMemo(() => {
    const today = getRestaurantBusinessDay();
    return activeCategories.flatMap((category) =>
      category.menu_items
        .filter((item) => isMenuItemVisibleToday(item, today))
        .map((item) => ({
          id: item.id,
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi,
          description_en: item.description_en || undefined,
          description_ja: item.description_ja || undefined,
          description_vi: item.description_vi || undefined,
          categoryId: category.id,
          tags: item.tags || [],
          prep_station: item.prep_station,
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
    timezone,
    guestCount: sessionData?.guestCount,
    currentCartItems: cartItems,
    previousOrders: sessionData?.orderHistory || [],
    restaurantId,
    availableMenuItems,
  });

  // Transform categories into smart menu items
  const allMenuItems = useMemo((): SmartMenuItem[] => {
    return transformToSmartMenuItems(
      activeCategories,
      locale,
      recommendedItems,
      recommendationReasons,
    );
  }, [activeCategories, locale, recommendedItems, recommendationReasons]);

  const visibleMenuCategories = useMemo(() => {
    const itemCounts = new Map<string, number>();
    allMenuItems.forEach((item) => {
      itemCounts.set(
        item.categoryId,
        (itemCounts.get(item.categoryId) || 0) + 1,
      );
    });

    return activeCategories
      .map((category) => ({
        category,
        count: itemCounts.get(category.id) || 0,
      }))
      .filter(({ count }) => count > 0);
  }, [activeCategories, allMenuItems]);

  // Smart categorization logic with enhanced algorithms
  const smartCategories = useMemo((): Record<string, SmartCategory> => {
    const popularItems = allMenuItems
      .filter((item) => item.averageRating && item.averageRating > 0)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
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
        name: tMenu("smart.perfect_for_you"),
        items: recommendedItemsData,
        icon: Sparkles,
        color: "from-purple-500 to-pink-500",
        description: tMenu("smart.perfect_for_you_description"),
        count: recommendedItemsData.length,
      },
      popular: {
        id: "popular",
        name: tMenu("smart.customer_favorites"),
        items: popularItems,
        icon: TrendingUp,
        color: "from-orange-500 to-red-500",
        description: tMenu("smart.customer_favorites_description"),
        count: popularItems.length,
      },
      [timeOfDay]: {
        id: timeOfDay,
        name: tMenu(`smart.${timeOfDay}`),
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
              ? "from-emerald-500 to-lime-500"
              : "from-[#c8773e] to-[#743f4b]",
        description: tMenu(`smart.${timeOfDay}_description`),
        count: timeBasedItems.length,
      },
    };
  }, [allMenuItems, tMenu, timeOfDay]);

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

  // Apply the derived restaurant theme for shared customer components.
  useEffect(() => {
    const previousValues = new Map<string, string>();

    Object.entries({
      ...customerThemeProperties,
      ...menuToneProperties,
    }).forEach(([key, value]) => {
      previousValues.set(
        key,
        document.documentElement.style.getPropertyValue(key),
      );
      document.documentElement.style.setProperty(key, value);
    });

    return () => {
      previousValues.forEach((value, key) => {
        if (value) {
          document.documentElement.style.setProperty(key, value);
        } else {
          document.documentElement.style.removeProperty(key);
        }
      });
    };
  }, [customerThemeProperties, menuToneProperties]);

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
    <div
      className="relative min-h-screen overflow-hidden text-[var(--co-menu-text)]"
      style={
        {
          ...customerThemeProperties,
          ...menuToneProperties,
          backgroundColor: "var(--co-menu-bg)",
          backgroundImage: "var(--co-menu-bg-image)",
          backgroundPosition: "var(--co-menu-bg-position)",
          backgroundSize: "var(--co-menu-bg-size)",
          backgroundRepeat: "var(--co-menu-bg-repeat)",
          fontFamily: "var(--co-menu-body-font)",
        } as React.CSSProperties
      }
    >
      {/* Restaurant header */}
      <div className="relative z-10 overflow-hidden bg-[var(--co-menu-hero)]">
        {/* Main content */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              {/* Logo or initial */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex-shrink-0"
              >
                {logoUrl ? (
                  <div className="h-9 w-9 overflow-hidden rounded-[12px] bg-[var(--co-menu-chip)] p-1 shadow-[0_16px_34px_-26px_rgba(116,63,42,0.65)] sm:h-11 sm:w-11 md:h-12 md:w-12">
                    <Image
                      src={logoUrl}
                      alt={restaurantName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--co-menu-chip)] shadow-[0_16px_34px_-26px_rgba(116,63,42,0.65)] sm:h-11 sm:w-11 md:h-12 md:w-12">
                    <UtensilsCrossed className="h-4 w-4 text-[var(--co-menu-muted)] sm:h-5 sm:w-5" />
                  </div>
                )}
              </motion.div>

              {/* Restaurant name + branch */}
              <div className="min-w-0 flex-1">
                <motion.h1
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="truncate text-[1.55rem] font-medium leading-none text-[var(--co-menu-text)] sm:text-[2.05rem] md:text-[2.35rem]"
                  style={{
                    fontFamily: "var(--co-menu-display-font)",
                    textShadow:
                      menuTone === "dark"
                        ? "0 1px 8px rgba(0,0,0,0.35)"
                        : "none",
                  }}
                >
                  {restaurantName}
                </motion.h1>
                {branchName && branchName !== restaurantName && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.16 }}
                    className="mt-1 inline-flex max-w-full items-center truncate rounded-[10px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--co-menu-muted)]"
                  >
                    {branchName}
                  </motion.span>
                )}
              </div>
            </div>

            <div className="flex w-auto shrink-0 items-center justify-end gap-1 self-auto">
              {sessionId && (
                <button
                  onClick={() =>
                    setView("history", { tableId, sessionId, tableNumber })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-chip)] text-[var(--co-menu-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors hover:bg-[var(--co-menu-subtle)] sm:h-10 sm:w-10 sm:rounded-[14px]"
                  aria-label={t("order_history_label")}
                >
                  <Clock className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleMenuTone}
                className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-chip)] text-[var(--co-menu-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors hover:bg-[var(--co-menu-subtle)] sm:h-10 sm:w-10 sm:rounded-[14px]"
                aria-label={
                  menuTone === "dark"
                    ? t("switch_to_light_mode")
                    : t("switch_to_dark_mode")
                }
                title={
                  menuTone === "dark"
                    ? t("switch_to_light_mode")
                    : t("switch_to_dark_mode")
                }
              >
                {menuTone === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <div className="[&_button]:h-9 [&_button]:w-10 [&_button]:rounded-[13px] [&_button]:border [&_button]:border-[var(--co-menu-chip-border)] [&_button]:bg-[var(--co-menu-chip)] [&_button]:px-0 [&_button]:text-[13px] [&_button]:font-semibold [&_button]:text-[var(--co-menu-text)] [&_button]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] [&_button]:hover:bg-[var(--co-menu-subtle)] sm:[&_button]:h-10 sm:[&_button]:w-11 sm:[&_button]:rounded-[14px]">
                <LanguageSwitcher
                  currentLocale={selectedLocale}
                  onLocaleChange={setSelectedLocale}
                  labelMode="code"
                  showFlag
                  triggerMode="flag"
                />
              </div>
              {/* Table badge */}
              {tableNumber && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.18 }}
                  className="flex h-9 flex-shrink-0 items-center gap-1 rounded-[13px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-chip)] px-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-sm sm:h-10 sm:gap-1.5 sm:rounded-[14px] sm:px-3.5"
                >
                  <p className="hidden text-[8px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--co-menu-muted)] sm:block">
                    {tMenu("table_label")}
                  </p>
                  <p className="text-[15px] font-semibold leading-none text-[var(--co-menu-text)] sm:text-base">
                    {tableNumber}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 px-4 pb-3 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <label className="relative flex h-12 items-center rounded-[16px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-chip)] px-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.72)] backdrop-blur-xl">
            <Search className="h-4 w-4 shrink-0 text-[var(--co-menu-muted)]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setHasUserInteracted(true);
              }}
              placeholder={tMenu("search_placeholder")}
              aria-label={tMenu("search_placeholder")}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--co-menu-text)] outline-none placeholder:text-[var(--co-menu-muted)]"
              type="search"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  searchInputRef.current?.focus();
                }}
                className="mr-1 rounded-full px-2 py-1 text-xs font-semibold text-[var(--co-menu-muted)] transition-colors hover:text-[var(--co-menu-text)]"
              >
                {tMenu("clear_search")}
              </button>
            ) : null}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[var(--co-menu-chip-border)] bg-[var(--co-menu-subtle)] text-[var(--co-menu-text)]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </span>
          </label>
        </div>
      </div>

      {visibleMenuCategories.length > 0 && (
        <nav className="sticky top-0 z-30 border-y border-[var(--co-menu-chip-border)] bg-[var(--co-menu-nav)] px-4 py-2 backdrop-blur-xl md:px-6 lg:px-8">
          <div
            className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto scrollbar-hide"
            aria-label={tMenu("category_nav.label")}
          >
            <button
              type="button"
              onClick={() => {
                setActiveCategoryFilter(null);
                setHasUserInteracted(true);
              }}
              aria-pressed={!activeCategoryFilter}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border border-[var(--co-menu-chip-border)] px-3 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--co-menu-accent)]"
              style={
                !activeCategoryFilter
                  ? {
                      backgroundColor: "var(--co-menu-accent)",
                      color: "#FFF7E9",
                    }
                  : {
                      backgroundColor: "var(--co-menu-chip)",
                      color: "var(--co-menu-chip-text)",
                    }
              }
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border border-current/35">
                <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
              </span>
              {tMenu("category_nav.all")}
            </button>

            {visibleMenuCategories.map(({ category, count }) => {
              const label = getLocalizedText(
                {
                  name_en: category.name_en || "",
                  name_ja: category.name_ja || "",
                  name_vi: category.name_vi || "",
                },
                locale,
              );
              const isActive = activeCategoryFilter === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryFilter(isActive ? null : category.id);
                    setHasUserInteracted(true);
                  }}
                  aria-pressed={isActive}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border border-[var(--co-menu-chip-border)] px-3 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--co-menu-accent)]"
                  style={
                    isActive
                      ? {
                          backgroundColor: "var(--co-menu-accent)",
                          color: "#FFF7E9",
                        }
                      : {
                          backgroundColor: "var(--co-menu-chip)",
                          color: "var(--co-menu-chip-text)",
                        }
                  }
                >
                  <span>{label}</span>
                  <span
                    className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] tabular-nums"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255,247,233,0.18)"
                        : "var(--co-menu-subtle)",
                      color: isActive ? "#FFF7E9" : "var(--co-menu-muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ── Scrollable content ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-32 pt-6 md:px-6 lg:px-8">
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
                  className="mt-2 text-center text-sm text-[var(--co-menu-muted)]"
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
                className="px-1"
              >
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6">
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
                          brandColor={safeBrandColor}
                          locale={locale}
                          currency={currency}
                          canAddItems={canAddItems}
                          showBadge={false}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="mb-4 text-[var(--co-menu-muted)]">
                      <Search className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-[var(--co-menu-text)]">
                      {t("menu.no_items_found")}
                    </h3>
                    <p className="mb-4 text-[var(--co-menu-muted)]">
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
              <div className="space-y-12 md:space-y-14">
                {/* Show filtered content when category filter is active */}
                {activeCategoryFilter ? (
                  /* Single category view */
                  <MenuSection
                    sectionId={
                      activeCategoryFilter
                        ? categoryDomId(activeCategoryFilter)
                        : undefined
                    }
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
                    brandColor={safeBrandColor}
                    locale={locale}
                    currency={currency}
                    canAddItems={canAddItems}
                    onItemClick={handleItemClick}
                    onAddToCart={handleAddToCart}
                    getQuantity={getQuantityByItemId}
                    eagerImages
                  />
                ) : (
                  /* Normal sectioned view */
                  <>
                    {/* Popular Section */}
                    {smartCategories.popular &&
                      smartCategories.popular.count > 0 && (
                        <MenuSection
                          sectionId="menu-category-popular"
                          title={t("menu.popular")}
                          description={t("menu.popular_description")}
                          items={smartCategories.popular.items}
                          brandColor={safeBrandColor}
                          locale={locale}
                          currency={currency}
                          canAddItems={canAddItems}
                          onItemClick={handleItemClick}
                          onAddToCart={handleAddToCart}
                          getQuantity={getQuantityByItemId}
                          showPopularBadge={true}
                          icon={<TrendingUp className="h-5 w-5" />}
                          eagerImages
                        />
                      )}

                    {/* Recommended Section */}
                    {smartCategories.recommended &&
                      smartCategories.recommended.count > 0 && (
                        <MenuSection
                          sectionId="menu-category-recommended"
                          title={t("menu.perfect_for_you")}
                          description={t("menu.perfect_for_you_description")}
                          items={smartCategories.recommended.items}
                          brandColor={safeBrandColor}
                          locale={locale}
                          currency={currency}
                          canAddItems={canAddItems}
                          onItemClick={handleItemClick}
                          onAddToCart={handleAddToCart}
                          getQuantity={getQuantityByItemId}
                          showRecommendedBadge={true}
                          icon={<Sparkles className="h-5 w-5" />}
                        />
                      )}

                    {/* Regular Categories */}
                    {visibleMenuCategories.map(
                      ({ category }, categoryIndex) => {
                        const categoryItems = allMenuItems.filter(
                          (item) => item.categoryId === category.id,
                        );
                        if (categoryItems.length === 0) return null;

                        return (
                          <MenuSection
                            key={category.id}
                            sectionId={categoryDomId(category.id)}
                            title={getLocalizedText(
                              {
                                name_en: category.name_en || "",
                                name_ja: category.name_ja || "",
                                name_vi: category.name_vi || "",
                              },
                              locale,
                            )}
                            items={categoryItems}
                            brandColor={safeBrandColor}
                            locale={locale}
                            currency={currency}
                            canAddItems={canAddItems}
                            onItemClick={handleItemClick}
                            onAddToCart={handleAddToCart}
                            getQuantity={getQuantityByItemId}
                            eagerImages={categoryIndex === 0}
                          />
                        );
                      },
                    )}
                  </>
                )}
              </div>
            )}
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
        locale={locale}
        brandColor={safeBrandColor}
        currency={currency}
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
