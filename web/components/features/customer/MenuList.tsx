"use client";
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X as XIcon,  Sparkles, Bot, MessageCircle, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLocalizedText } from "./utils";
import type { ViewType, ViewProps } from "./screens/types";
import { FoodCard, FoodItem } from "./FoodCard";
import { useTranslations } from "next-intl";
import {  Category } from '@/shared/types/menu';

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
  const t = useTranslations("Customer");
  //const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  const [isFloatingSearchExpanded, setIsFloatingSearchExpanded] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  //const t = useTranslations("Customer");
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

  // All available items for search with enhanced filtering
  const allItems = useMemo(() => {
    const items = categories.flatMap((cat) =>
      cat.menu_items
        .filter((item) => item.available && item.weekday_visibility.includes(today))
        .map((item) => ({ 
          ...item, 
          categoryId: cat.id, 
          categoryName: getLocalizedText(cat as unknown as Record<string, unknown>, locale),
          isInCart: getQty(item.id) > 0,
          contextScore: 0 // Will be calculated below
        }))
    );

    // Calculate context scores for smart discovery
    items.forEach(item => {
      const name = getLocalizedText(item as unknown as Record<string, unknown>, locale).toLowerCase();
      let score = 0;
      
      // Time-based scoring
      if (mealContext === "breakfast" && /breakfast|coffee|tea|pastry|croissant|muffin|bagel|yogurt|cereal|juice|smoothie/i.test(name)) score += 10;
      if (mealContext === "lunch" && /lunch|salad|sandwich|soup|pasta|noodle|rice|bowl|wrap/i.test(name)) score += 10;
      if (mealContext === "dinner" && /dinner|steak|fish|chicken|beef|pork|lamb|curry|pizza|burger/i.test(name)) score += 10;
      
      // Weekend/special occasion scoring
      if (isWeekend && /share|platter|special|premium|wine|cocktail|dessert|cake/i.test(name)) score += 5;
      
      // Popularity scoring
      if (item.reviewCount && item.reviewCount > 10) score += 3;
      if (item.averageRating && item.averageRating >= 4.5) score += 3;
      
      // Category context
      if (/appetizer|starter/i.test(item.categoryName)) score += mealContext === "dinner" ? 2 : 0;
      if (/dessert/i.test(item.categoryName)) score += 1;
      
      item.contextScore = score;
    });

    return items;
  }, [categories, locale, today, getQty, mealContext, isWeekend]);

  // Top suggestions - popular and recommended items
  const topSuggestions = useMemo(() => {
    const items = categories.flatMap((c) => c.menu_items);
    const availableItems = items.filter((item) => 
      item.available && item.weekday_visibility.includes(today)
    );
    
    // Combine recommended items with popular items
    const suggestions = [
      ...recommended.filter(item => item.available),
      ...availableItems
        .filter(item => !recommended.find(r => r.id === item.id)) // Avoid duplicates
        .sort((a, b) => {
          // Score by rating and review count
          const scoreA = (a.averageRating || 0) * Math.log(Math.max(1, a.reviewCount || 1));
          const scoreB = (b.averageRating || 0) * Math.log(Math.max(1, b.reviewCount || 1));
          return scoreB - scoreA;
        })
    ].slice(0, 4);
    
    return suggestions;
  }, [categories, today, recommended]);

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

    // Apply price range filter
    items = items.filter(item => item.price >= priceRange[0] && item.price <= priceRange[1]);

    // Apply rating filter
    if (minRating > 0) {
      items = items.filter(item => (item.averageRating || 0) >= minRating);
    }


    return items;
  }, [allItems, searchTerm, selectedCategory, locale, priceRange, minRating]);

  // Group filtered items by category for display
  const filteredCategories = useMemo(() => {
    if (searchTerm.trim() || selectedCategory !== "all") {
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
    
    return categories.map((cat) => ({
      ...cat,
      menu_items: cat.menu_items.filter((item) => 
        item.available && item.weekday_visibility.includes(today)
      ),
    })).filter((cat) => cat.menu_items.length > 0);
  }, [categories, filteredAndSortedItems, searchTerm, selectedCategory, today]);

  const clearSearch = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setPriceRange([0, 1000]);
    setMinRating(0);
    //setShowAdvancedFilters(false);
    setIsFloatingSearchExpanded(false);
  };

  const handleSearchExpand = () => {
    setIsFloatingSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  };

  const handleSearchCollapse = () => {
    if (!searchTerm.trim()) {
      setIsFloatingSearchExpanded(false);
    }
  };

  const hasActiveFilters = searchTerm.trim() || selectedCategory !== "all" || priceRange[0] > 0 || priceRange[1] < 1000 || minRating > 0;

  // Calculate total cart items and amount
  const cartItems = useMemo(() => {
    const items = allItems.filter(item => getQty(item.id) > 0);
    const totalItems = items.reduce((sum, item) => sum + getQty(item.id), 0);
    const totalAmount = items.reduce((sum, item) => sum + (item.price * getQty(item.id)), 0);
    return { items, totalItems, totalAmount };
  }, [allItems, getQty]);


  return (
    <div className="relative pb-20">
      {/* Top Suggestions Section */}
      {topSuggestions.length > 0 && !hasActiveFilters && (
        <div className="mb-6 px-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: brandColor }} />
            <span>{t("pick_for_you")}</span>
          </h2>
          
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {topSuggestions.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-64 flex-shrink-0"
              >
                <FoodCard
                  item={item}
                  qtyInCart={getQty(item.id)}
                  onAdd={() => addToCart(item)}
                  onDecrease={() => updateQty?.(item.id, getQty(item.id) - 1)}
                  onIncrease={() => updateQty?.(item.id, getQty(item.id) + 1)}
                  brandColor={brandColor}
                  locale={locale}
                  canAddItems={canAddItems}
                  setView={setView}
                  tableId={tableId}
                  sessionId={sessionId}
                  tableNumber={tableNumber}
                  viewMode="list"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 px-4">
          {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'} found
        </div>
      )}

      {/* Menu Categories */}
      <AnimatePresence mode="wait">
        {filteredCategories.length > 0 ? (
          <motion.div
            key="menu-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8 px-4 pb-24"
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
                  className="text-xl font-semibold mb-4 pb-2 border-b-2 border-opacity-30 flex items-center justify-between"
                  style={{ color: brandColor, borderColor: brandColor }}
                >
                  <span>
                    {getLocalizedText(cat as unknown as Record<string, unknown>, locale)}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({cat.menu_items.length})
                    </span>
                  </span>
                  
                  {/* Swipe indicator for horizontal scroll */}
                  {cat.menu_items.length > 2 && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="hidden sm:inline">Swipe for more</span>
                      <span className="sm:hidden">→</span>
                    </div>
                  )}
                </h3>
                
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {cat.menu_items.map((item, itemIndex) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: itemIndex * 0.05 }}
                      className="w-64 flex-shrink-0"
                    >
                      <motion.div whileTap={canAddItems ? { scale: 0.98 } : {}}>
                        <FoodCard
                          item={item}
                          qtyInCart={getQty(item.id)}
                          onAdd={() => addToCart(item)}
                          onDecrease={() => updateQty?.(item.id, getQty(item.id) - 1)}
                          onIncrease={() => updateQty?.(item.id, getQty(item.id) + 1)}
                          brandColor={brandColor}
                          locale={locale}
                          canAddItems={canAddItems}
                          setView={setView}
                          tableId={tableId}
                          sessionId={sessionId}
                          tableNumber={tableNumber}
                          viewMode="list"
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
            className="text-center py-12 px-4"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              {t("no_results_found")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t("adjusting_filters_or_search")}
            </p>
            <Button onClick={clearSearch} variant="outline">
              {t("clear_filters")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Bottom Category Filter Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 py-3 safe-area-pb">
        <div className="px-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Items */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium shadow-md border transition-all flex-shrink-0 ${
                selectedCategory === "all"
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              style={selectedCategory === "all" ? { backgroundColor: brandColor } : {}}
            >
              All Items
            </motion.button>

            {/* Category Pills */}
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium shadow-md border transition-all flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: brandColor } : {}}
                title={getLocalizedText(cat as unknown as Record<string, unknown>, locale)}
              >
                {getLocalizedText(cat as unknown as Record<string, unknown>, locale)}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end space-y-3">
        {/* Cart Button - Only show when there are items in cart */}
        <AnimatePresence>
          {cartItems.totalItems > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('checkout')}
              className="relative w-12 h-12 rounded-full shadow-xl flex items-center justify-center backdrop-blur-md border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl"
              style={{ backgroundColor: brandColor }}
            >
              <div className="text-white text-center">
                <ShoppingCart className="h-5 w-5" />
                <div className="text-xs font-bold">{cartItems.totalItems}</div>
              </div>
              {/* Pulse animation for new items */}
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: brandColor }}
              />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating Search Bar */}
        <motion.div
          className="relative"
          animate={{
            width: isFloatingSearchExpanded ? 280 : 56,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <AnimatePresence>
            {isFloatingSearchExpanded ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-700 p-2 flex items-center space-x-2"
              >
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={handleSearchCollapse}
                  className="border-0 bg-transparent focus:ring-0 text-sm flex-1 px-2"
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIChat(true)}
                  className="rounded-full h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                  title="Chat with AI for recommendations"
                >
                  <Bot className="h-4 w-4 text-blue-600" />
                </Button>

                {searchTerm.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="rounded-full h-8 w-8 p-0"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSearchExpand}
                className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center backdrop-blur-md border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl"
                style={{ backgroundColor: brandColor }}
              >
                <Search className="h-4 w-4 text-white" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Active Filters Display - Floating at top when filters are active */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl p-3"
          >
            <div className="flex flex-wrap gap-2">
              {searchTerm.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: &quot;{searchTerm}&quot;
                  <button onClick={() => setSearchTerm("")} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {categories.find(c => c.id === selectedCategory)?.name_en || "Category"}
                  <button onClick={() => setSelectedCategory("all")} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  ${priceRange[0]}-${priceRange[1]}
                  <button onClick={() => setPriceRange([0, 1000])} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {minRating > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {minRating}+ stars
                  <button onClick={() => setMinRating(0)} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowAIChat(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">AI Menu Assistant</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAIChat(false)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Hi! I&quot;m your AI menu assistant. Ask me about dishes, dietary preferences, or get personalized recommendations!
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                    <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">What&quot;s your most popular dish?</span>
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                    <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">I&quot;m vegetarian, what do you recommend?</span>
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
                    <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">What&quot;s good for a quick lunch?</span>
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ask me anything about the menu..."
                    className="flex-1"
                  />
                  <Button size="sm" style={{ backgroundColor: brandColor }} className="text-white">
                    Send
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
