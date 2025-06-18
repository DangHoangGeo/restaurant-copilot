'use client';

import React, { useState, useMemo, useCallback, useRef, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  TrendingUp, 
  Sparkles,
  ChefHat,
  ArrowRight,
  Heart,
  Bot,
  RefreshCw
} from 'lucide-react';
import { getLocalizedText } from '@/lib/customerUtils';
import { ContextualGreeting, generateContextualInfo } from '@/components/common/ContextualGreeting';
import { FoodCard } from '@/components/features/customer/FoodCard';
import { ItemDetailModal } from '@/components/features/customer/menu/ItemDetailModal';
import { SmartMenuSkeleton, MenuCardSkeleton } from '@/components/ui/enhanced-skeleton';
import { useCart } from '@/components/features/customer/CartContext';
import { AIAssistant } from '@/components/features/customer/layout/AIAssistant';
import { useMenuData } from '@/hooks/useMenuData';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useSessionData } from '@/hooks/useSessionData';
import type { Category, MenuItemSize, Topping } from '@/shared/types/menu';
import type { ViewType, ViewProps } from '@/components/features/customer/screens/types';
import type { FoodItem } from '@/components/features/customer/FoodCard';


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

interface EnhancedSmartMenuProps {
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
  restaurantId?: string;
}

// Helper function to get time of day classification
const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'late';
};

// Transform categories into enhanced smart menu items
const transformToSmartMenuItems = (
  categories: Category[], 
  locale: string, 
  recommendedItems: string[] = [],
  recommendationReasons: Record<string, string> = {}
): SmartMenuItem[] => {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  
  return categories.flatMap((category) =>
    category.menu_items
      .filter((item) => 
        item.available && 
        item.weekday_visibility.includes(today)
      )
      .map((item): SmartMenuItem => {
        const isRecommended = recommendedItems.includes(item.id);
        return {
          ...item,
          categoryId: category.id,
          categoryName: getLocalizedText(
            { name_en: category.name_en || '', name_ja: category.name_ja || '', name_vi: category.name_vi || '' },
            locale
          ),
          searchText: `${getLocalizedText(
            { name_en: item.name_en || '', name_ja: item.name_ja || '', name_vi: item.name_vi || '' },
            locale
          )} ${item.description_en || ''} ${item.description_ja || ''} ${item.description_vi || ''}`.toLowerCase(),
          rating: 4.0 + Math.random() * 1.0, // Mock rating 4.0-5.0
          reviewCount: Math.floor(Math.random() * 50) + 5, // Mock review count 5-55
          isPopular: Math.random() > 0.7,
          isNew: Math.random() > 0.9,
          tags: item.tags || [],
          estimatedPrepTime: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
          calories: Math.floor(Math.random() * 400) + 200, // 200-600 calories
          isRecommended,
          recommendationReason: isRecommended ? recommendationReasons[item.id] : undefined
        };
      })
  );
};

export function EnhancedSmartMenu({
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
  restaurantId
}: EnhancedSmartMenuProps) {
  const { addToCart, getQuantityByItemId, cart } = useCart();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [activeSmartCategory, setActiveSmartCategory] = useState<string>('all');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SmartMenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Data fetching hooks
  const { 
    categories: fetchedCategories, 
    isLoading: menuLoading, 
    isError: menuError,
    prefetchItemDetails,
    refetch: refetchMenu
  } = useMenuData({
    restaurantId,
    locale,
    sessionId,
    tableId
  });

  const { sessionData } = useSessionData({
    sessionId,
    tableId,
    restaurantId
  });

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const cartItems = useMemo(() => cart.map((item: { itemId: string }) => item.itemId), [cart]);

  // Use fetched data or fallback
  const activeCategories = fetchedCategories.length > 0 ? fetchedCategories : fallbackCategories;

  // Prepare menu items for recommendations
  const availableMenuItems = useMemo(() => {
    return activeCategories.flatMap(category => 
      category.menu_items
        .filter(item => item.available)
        .map(item => ({
          id: item.id,
          name_en: item.name_en,
          name_ja: item.name_ja,
          name_vi: item.name_vi,
          description_en: item.description_en || undefined,
          description_ja: item.description_ja || undefined,
          description_vi: item.description_vi || undefined,
          categoryId: category.id
        }))
    );
  }, [activeCategories]);

  const { 
    recommendedItems, 
    recommendationReasons,
    isLoading: recommendationsLoading 
  } = useRecommendations({
    sessionId,
    tableId,
    timeOfDay,
    currentCartItems: cartItems,
    previousOrders: sessionData?.orderHistory || [],
    restaurantId,
    availableMenuItems
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
      recommendationReasons
    );
  }, [activeCategories, locale, recommendedItems, recommendationReasons]);

  // Smart categorization logic with enhanced algorithms
  const smartCategories = useMemo((): Record<string, SmartCategory> => {
    const popularItems = allMenuItems
      .filter(item => item.reviewCount && item.reviewCount > 10)
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 8);

    const recommendedItemsData = allMenuItems
      .filter(item => item.isRecommended)
      .slice(0, 8);

    const timeBasedKeywords = {
      breakfast: ['coffee', 'tea', 'pastry', 'egg', 'toast', 'pancake', 'cereal', 'morning'],
      lunch: ['sandwich', 'salad', 'soup', 'bowl', 'wrap', 'burger', 'quick'],
      afternoon: ['snack', 'light', 'tea', 'coffee', 'sweet'],
      dinner: ['main', 'pasta', 'rice', 'meat', 'fish', 'steak', 'dinner'],
      late: ['snack', 'light', 'drink', 'dessert', 'simple']
    };

    const keywords = timeBasedKeywords[timeOfDay as keyof typeof timeBasedKeywords] || [];
    const timeBasedItems = allMenuItems
      .filter(item => 
        keywords.some(keyword => 
          item.searchText.toLowerCase().includes(keyword.toLowerCase())
        )
      )
      .slice(0, 8);

    return {
      recommended: {
        id: 'recommended',
        name: 'Perfect for You',
        items: recommendedItemsData,
        icon: Sparkles,
        color: 'from-purple-500 to-pink-500',
        description: `AI-curated picks for ${contextualInfo.timeContext.toLowerCase()}`,
        count: recommendedItemsData.length
      },
      popular: {
        id: 'popular',
        name: 'Customer Favorites',
        items: popularItems,
        icon: TrendingUp,
        color: 'from-orange-500 to-red-500',
        description: 'Most loved by our customers',
        count: popularItems.length
      },
      [timeOfDay]: {
        id: timeOfDay,
        name: `Perfect for ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`,
        items: timeBasedItems,
        icon: timeOfDay === 'breakfast' ? ChefHat : timeOfDay === 'lunch' ? Clock : Heart,
        color: timeOfDay === 'breakfast' ? 'from-yellow-500 to-orange-500' : 
               timeOfDay === 'lunch' ? 'from-green-500 to-blue-500' : 
               'from-blue-500 to-purple-500',
        description: `Ideal choices for your ${timeOfDay} cravings`,
        count: timeBasedItems.length
      }
    };
  }, [allMenuItems, contextualInfo.timeContext, timeOfDay]);

  // Filtered items based on search and active category
  const filteredItems = useMemo(() => {
    let items = allMenuItems;

    // Apply search filter
    if (debouncedSearchTerm) {
      items = items.filter(item =>
        item.searchText.includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Apply smart category filter
    if (activeSmartCategory && activeSmartCategory !== 'all') {
      const categoryItems = smartCategories[activeSmartCategory]?.items || [];
      items = debouncedSearchTerm ? items : categoryItems;
    }

    return items;
  }, [allMenuItems, debouncedSearchTerm, activeSmartCategory, smartCategories]);

  // Optimized event handlers
  const handleItemClick = useCallback((item: FoodItem) => {
    // Convert FoodItem to SmartMenuItem for modal
    const smartItem = item as SmartMenuItem;
    setSelectedItem(smartItem);
    setIsItemModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsItemModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleModalAddToCart = useCallback((
    item: FoodItem, 
    quantity: number, 
    selectedSize?: MenuItemSize, 
    selectedToppings?: Topping[], 
    notes?: string
  ) => {
    // For now, use the existing add to cart logic
    // TODO: Enhance to handle size, toppings, and notes properly
    console.log('Adding to cart:', { item: item.id, quantity, selectedSize, selectedToppings, notes });
    
    if (onAddToCart) {
      onAddToCart(item as SmartMenuItem);
    } else {
      for (let i = 0; i < quantity; i++) {
        addToCart(item as SmartMenuItem, 1);
      }
    }
  }, [onAddToCart, addToCart]);

  const handleItemHover = useCallback(async (itemId: string) => {
    // Prefetch item details for faster loading
    await prefetchItemDetails(itemId);
  }, [prefetchItemDetails]);

  const handleAddToCart = useCallback((item: SmartMenuItem) => {
    if (!canAddItems) return;
    
    // Check if item has sizes or toppings - if so, open detail modal instead
    const hasSizes = item.menu_item_sizes && item.menu_item_sizes.length > 0;
    const hasToppings = item.toppings && item.toppings.length > 0;
    
    if (hasSizes || hasToppings) {
      // Redirect to item detail modal for customization
      handleItemClick(item);
      return;
    }
    
    if (onAddToCart) {
      onAddToCart(item);
    } else {
      addToCart(item, 1);
    }
  }, [canAddItems, onAddToCart, addToCart, handleItemClick]);

  const handleUpdateQuantity = useCallback((itemId: string, newQty: number) => {
    if (!canAddItems) return;
    
    const currentQty = getQuantityByItemId(itemId);
    
    if (newQty <= 0) return;
    
    if (newQty > currentQty) {
      const item = allMenuItems.find(i => i.id === itemId);
      if (item) {
        addToCart(item, newQty - currentQty);
      }
    }
  }, [canAddItems, getQuantityByItemId, addToCart, allMenuItems]);

  // Get smart category display order
  const smartCategoryOrder = useMemo(() => {
    return ['recommended', 'popular', timeOfDay].filter(key => 
      smartCategories[key] && smartCategories[key].count > 0
    );
  }, [smartCategories, timeOfDay]);

  // Apply restaurant brand color
  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty('--brand-color', brandColor);
    }
  }, [brandColor]);

  // Auto-switch to recommended when recommendations load (only if user hasn't interacted)
  useEffect(() => {
    if (!hasUserInteracted && 
        !recommendationsLoading && 
        recommendedItems.length > 0 && 
        activeSmartCategory === 'all') {
      setActiveSmartCategory('recommended');
    }
  }, [recommendationsLoading, recommendedItems.length, hasUserInteracted, activeSmartCategory]);

  // Loading states
  const isLoading = menuLoading || recommendationsLoading;

  if (isLoading) {
    return <SmartMenuSkeleton />;
  }

  if (menuError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">Failed to load menu</div>
          <Button onClick={() => refetchMenu()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header with contextual greeting */}
      <ContextualGreeting 
        contextualInfo={contextualInfo}
        variant="compact"
        className="bg-white dark:bg-slate-900 shadow-md"
        showWeather={true}
        showTimeInfo={true}
      />

      {/* Search and Smart Categories */}
      <div className="container mx-auto px-4 py-6">
        {/* Enhanced Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-12 text-lg rounded-full border-2 border-gray-200 focus:border-[var(--brand-color)] transition-colors"
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
                  onClick={() => setSearchTerm('')}
                  className="h-6 w-6 p-0 rounded-full"
                >
                  ×
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Smart Category Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={activeSmartCategory === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setActiveSmartCategory('all');
                setHasUserInteracted(true);
              }}
              className={`flex-shrink-0 ${
                activeSmartCategory === 'all' ? 'text-white font-medium border-0' : ''
              }`}
              style={{
                whiteSpace: 'nowrap',
                ...(activeSmartCategory === 'all' ? {
                  backgroundColor: 'var(--brand-color)',
                  color: 'white',
                  borderColor: 'var(--brand-color)'
                } : {})
              }}
            >
              All Items
            </Button>
            {smartCategoryOrder.map((categoryKey) => {
              const category = smartCategories[categoryKey];
              const IconComponent = category.icon || Sparkles;
              const isActive = activeSmartCategory === categoryKey;
              
              return (
                <Button
                  key={categoryKey}
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => {
                    setActiveSmartCategory(categoryKey);
                    setHasUserInteracted(true);
                  }}
                  className={`flex-shrink-0 flex items-center gap-2 ${
                    isActive ? 'text-white font-medium border-0' : ''
                  }`}
                  style={{
                    whiteSpace: 'nowrap',
                    ...(isActive ? {
                      backgroundColor: 'var(--brand-color)',
                      color: 'white',
                      borderColor: 'var(--brand-color)'
                    } : {})
                  }}
                >
                  <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                  {category.name}
                  <Badge 
                    variant={isActive ? 'outline' : 'secondary'} 
                    className={`ml-1 text-xs ${
                      isActive ? 'bg-white/20 text-white border-white/30' : ''
                    }`}
                  >
                    {category.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
          
          {/* Category Description */}
          {activeSmartCategory && activeSmartCategory !== 'all' && smartCategories[activeSmartCategory] && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-gray-600 mt-2 text-center"
            >
              {smartCategories[activeSmartCategory].description}
            </motion.p>
          )}
        </div>

        {/* Menu Items Grid with Suspense */}
        <Suspense fallback={<MenuCardSkeleton count={9} />}>
          <AnimatePresence mode="wait">
            {filteredItems.length > 0 ? (
              <motion.div
                key={`${activeSmartCategory}-${debouncedSearchTerm}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onHoverStart={() => handleItemHover(item.id)}
                  className="h-full relative"
                >
                  <FoodCard
                    item={item}
                    qtyInCart={getQuantityByItemId(item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onDecrease={() => handleUpdateQuantity(item.id, getQuantityByItemId(item.id) - 1)}
                    onIncrease={() => handleUpdateQuantity(item.id, getQuantityByItemId(item.id) + 1)}
                    brandColor={brandColor}
                    locale={locale}
                    canAddItems={canAddItems}
                    setView={setView}
                    tableId={tableId}
                    sessionId={sessionId}
                    tableNumber={tableNumber}
                    viewMode="grid"
                    onItemClick={handleItemClick}
                  />
                  
                  {/* Enhanced item indicators */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {item.isNew && (
                      <Badge className="bg-green-500 text-white text-xs">
                        New
                      </Badge>
                    )}
                    {item.isPopular && (
                      <Badge className="bg-orange-500 text-white text-xs flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Popular
                      </Badge>
                    )}
                    {item.isRecommended && (
                      <Badge className="bg-purple-500 text-white text-xs flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI Pick
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-gray-400 mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No items found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search or browse different categories
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveSmartCategory('recommended');
                  }}
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>

        {/* Quick Access Actions */}
        <div className="mt-12 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setIsAIAssistantOpen(true)}
            className="flex items-center gap-2"
          >
            <Bot className="h-4 w-4" />
            Ask AI Assistant
          </Button>
          <Button
            variant="outline"
            onClick={() => setView('checkout', { tableId, sessionId, tableNumber })}
          >
            View History
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* AI Assistant Integration */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onToggle={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        restaurantName={restaurantName}
        currentContext="menu"
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
        locale={locale}
        brandColor={brandColor}
        onAddToCart={handleModalAddToCart}
        canAddItems={canAddItems}
      />
    </div>
  );
}
