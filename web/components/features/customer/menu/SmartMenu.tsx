'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Bot
} from 'lucide-react';
import { getLocalizedText } from '@/lib/customerUtils';
import { generateContextualInfo } from '@/components/common/ContextualGreeting';
import { FoodCard, FoodItem } from '@/components/features/customer/FoodCard';
import { useCart } from '@/components/features/customer/CartContext';
import { AIAssistant } from '@/components/features/customer/layout/AIAssistant';
import type { Category } from '@/shared/types/menu';
import type { ViewType, ViewProps } from '@/components/features/customer/screens/types';

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
  categories: Category[];
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
}

// Helper function to get time of day classification for menu items
const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'late';
};

// Helper function to get popular items (mock implementation)
const getPopularItems = (items: SmartMenuItem[]): SmartMenuItem[] => {
  return items
    .filter(item => item.reviewCount && item.reviewCount > 5)
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 6);
};

// Helper function to get AI recommendations (mock implementation)
const getAIRecommendations = (items: SmartMenuItem[], timeOfDay: string): SmartMenuItem[] => {
  const timeBasedKeywords = {
    breakfast: ['coffee', 'tea', 'pastry', 'egg', 'toast', 'pancake', 'cereal', 'morning'],
    lunch: ['sandwich', 'salad', 'soup', 'bowl', 'wrap', 'burger', 'quick'],
    afternoon: ['snack', 'light', 'tea', 'coffee', 'sweet'],
    dinner: ['main', 'pasta', 'rice', 'meat', 'fish', 'steak', 'dinner'],
    late: ['snack', 'light', 'drink', 'dessert', 'simple']
  };

  const keywords = timeBasedKeywords[timeOfDay as keyof typeof timeBasedKeywords] || [];
  
  return items
    .filter(item => 
      keywords.some(keyword => 
        item.searchText.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .slice(0, 6);
};

// Helper function to get items by time-based categories
const getCategoryItemsByTime = (items: SmartMenuItem[], timeOfDay: string): SmartMenuItem[] => {
  return getAIRecommendations(items, timeOfDay);
};

export function SmartMenu({
  categories,
  onAddToCart,
  searchPlaceholder = "Search menu items...",
  locale,
  brandColor,
  canAddItems,
  setView,
  tableId,
  sessionId,
  tableNumber,
  restaurantName = "Our Restaurant"
}: SmartMenuProps) {
  const { addToCart, getQuantityByItemId } = useCart();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSmartCategory, setActiveSmartCategory] = useState<string>('recommended');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [prefetchedItems, setPrefetchedItems] = useState<Set<string>>(new Set());
  
  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounced search effect
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Generate contextual information
  const contextualInfo = useMemo(() => {
    return generateContextualInfo(restaurantName, locale);
  }, [restaurantName, locale]);

  // Transform categories into smart menu items
  const allMenuItems = useMemo((): SmartMenuItem[] => {
    const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
    
    return categories.flatMap((category) =>
      category.menu_items
        .filter((item) => 
          item.available && 
          item.weekday_visibility.includes(today)
        )
        .map((item): SmartMenuItem => ({
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
          tags: item.tags || []
        }))
    );
  }, [categories, locale]);

  // Smart categorization logic
  const smartCategories = useMemo((): Record<string, SmartCategory> => {
    const timeOfDay = getTimeOfDay();
    const popularItems = getPopularItems(allMenuItems);
    const recommendedItems = getAIRecommendations(allMenuItems, timeOfDay);
    const timeBasedItems = getCategoryItemsByTime(allMenuItems, timeOfDay);

    return {
      recommended: {
        id: 'recommended',
        name: 'Perfect for You',
        items: recommendedItems,
        icon: Sparkles,
        color: 'from-purple-500 to-pink-500',
        description: `AI-curated picks for ${contextualInfo.timeContext.toLowerCase()}`,
        count: recommendedItems.length
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
  }, [allMenuItems, contextualInfo.timeContext]);

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

  // Prefetch item details on hover
  const handleItemHover = useCallback(async (itemId: string) => {
    if (prefetchedItems.has(itemId)) return;
    
    setHoveredItemId(itemId);
    
    // Simulate prefetching item details
    try {
      // Replace with actual API call
      // await fetch(`/api/v1/customer/menu/items/${itemId}`);
      setPrefetchedItems(prev => new Set([...prev, itemId]));
    } catch {
      console.log('Prefetch failed for item:', itemId);
    }
  }, [prefetchedItems]);

  // Handle add to cart with animation feedback
  const handleAddToCart = useCallback((item: SmartMenuItem) => {
    if (!canAddItems) return;
    
    if (onAddToCart) {
      onAddToCart(item);
    } else {
      addToCart(item, 1);
    }
  }, [canAddItems, onAddToCart, addToCart]);

  // Handle quantity updates for existing cart items
  const handleUpdateQuantity = useCallback((itemId: string, newQty: number) => {
    if (!canAddItems) return;
    
    // Find all cart items for this itemId
    const currentQty = getQuantityByItemId(itemId);
    
    if (newQty <= 0) {
      // Remove item completely - this would need more sophisticated logic for variations
      // For now, just do nothing as this gets complex with size/topping variations
      return;
    }
    
    if (newQty > currentQty) {
      // Add more - find the item and add another simple version
      const item = allMenuItems.find(i => i.id === itemId);
      if (item) {
        addToCart(item, newQty - currentQty);
      }
    }
    // Decreasing is more complex due to variations, skip for now
  }, [canAddItems, getQuantityByItemId, addToCart, allMenuItems]);

  // Get smart category display order
  const smartCategoryOrder = useMemo(() => {
    const timeOfDay = getTimeOfDay();
    return ['recommended', 'popular', timeOfDay].filter(key => 
      smartCategories[key] && smartCategories[key].count > 0
    );
  }, [smartCategories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header with contextual greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold mb-2">
              {contextualInfo.greeting}
            </h1>
            <p className="text-white/80 max-w-md mx-auto">
              {contextualInfo.weatherSuggestion}
            </p>
          </motion.div>
        </div>
      </div>

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
              className="pl-10 w-full h-12 text-lg rounded-full border-2 border-gray-200 focus:border-purple-500 transition-colors"
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
              onClick={() => setActiveSmartCategory('all')}
              className="whitespace-nowrap"
            >
              All Items
            </Button>
            {smartCategoryOrder.map((categoryKey) => {
              const category = smartCategories[categoryKey];
              const IconComponent = category.icon || Sparkles;
              
              return (
                <Button
                  key={categoryKey}
                  variant={activeSmartCategory === categoryKey ? 'default' : 'outline'}
                  onClick={() => setActiveSmartCategory(categoryKey)}
                  className="whitespace-nowrap flex items-center gap-2"
                  style={activeSmartCategory === categoryKey ? {
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    backgroundImage: category.color
                  } : undefined}
                >
                  <IconComponent className="h-4 w-4" />
                  {category.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
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

        {/* Menu Items Grid */}
        <AnimatePresence mode="wait">
          {filteredItems.length > 0 ? (
            <motion.div
              key={`${activeSmartCategory}-${debouncedSearchTerm}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredItems.map((item, index) => (
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
                    {hoveredItemId === item.id && prefetchedItems.has(item.id) && (
                      <Badge className="bg-blue-500 text-white text-xs">
                        ✓ Ready
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
            View Cart
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
    </div>
  );
}

export default SmartMenu;
