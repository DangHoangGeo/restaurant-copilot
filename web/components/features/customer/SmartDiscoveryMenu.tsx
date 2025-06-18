"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
// import { useTranslations } from "next-intl"; // Removed unused import
import Image from "next/image"; // Added for Next.js Image component
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Heart, 
  Zap, Camera, Search,
  TrendingUp, Star, Shuffle, ChevronRight,
  Bot, Send, MessageCircle, X, Loader2,
   Flame, Leaf,
   LucideProps
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoodCard, FoodItem } from "./FoodCard";
import { getLocalizedText } from "./utils";
import type { ViewType, ViewProps } from "./screens/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for sort
import { Checkbox } from "@/components/ui/checkbox"; // Added for dietary filters
import { Label } from "@/components/ui/label"; // Added for checkbox labels
import { Category } from '@/shared/types/menu';
import { generateContextualInfo } from "@/components/common/ContextualGreeting";
import { RestaurantSettings } from "@/shared/types";

// Extended FoodItem interface for smart discovery features
interface SmartFoodItem extends FoodItem {
  rating?: number;
  reviewCount?: number;
  categoryId: string;
  categoryName: string;
  searchText: string;
}

interface SmartDiscoveryMenuProps {
  categories: Category[];
  locale: string;
  addToCart: (item: FoodItem) => void;
  updateQty?: (id: string, qty: number) => void;
  getQty: (id: string) => number;
  brandColor: string;
  canAddItems?: boolean;
  setView: (view: ViewType, props?: ViewProps) => void;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  restaurantSettings: RestaurantSettings;
}

type MoodType = "quick" | "comfort" | "healthy" | "indulgent" | "adventure" | "classic";
type DiscoveryMode = "mood" | "visual" | "smart" | "trending" | "ai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: FoodItem[];
}

interface DietaryFilter {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  spicy: boolean;
  lowCalorie: boolean;
}

interface moodConfig {
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>
  color: string;
  keywords: string[];
  tags: string[];
  description: string;
}

const MOOD_CONFIG = {
  quick: {
    icon: Zap,
    color: "from-yellow-400 to-orange-500",
    keywords: ["quick", "fast", "ready", "instant", "snack", "takeaway", "express"],
    tags: ["Under 10min", "Grab & Go"],
    description: "Fast and satisfying options for when you're in a hurry"
  },
  comfort: {
    icon: Heart,
    color: "from-pink-400 to-red-500",
    keywords: ["comfort", "warm", "cozy", "home", "traditional", "hearty", "nostalgic"],
    tags: ["Soul Food", "Warm"],
    description: "Hearty, warming dishes that feel like a hug"
  },
  healthy: {
    icon: Leaf,
    color: "from-green-400 to-emerald-500",
    keywords: ["fresh", "light", "salad", "vegetable", "healthy", "lean", "organic"],
    tags: ["Fresh", "Light", "Nutritious"],
    description: "Fresh, nutritious options to fuel your body"
  },
  indulgent: {
    icon: Flame,
    color: "from-purple-400 to-pink-500",
    keywords: ["rich", "creamy", "cheese", "chocolate", "dessert", "decadent", "luxury"],
    tags: ["Rich", "Decadent", "Treat"],
    description: "Rich, indulgent treats for special moments"
  },
  adventure: {
    icon: Sparkles,
    color: "from-blue-400 to-cyan-500",
    keywords: ["special", "unique", "fusion", "new", "signature", "exotic", "chef"],
    tags: ["Signature", "Unique", "Chef&apos;s Special"],
    description: "Unique creations and chef&apos;s special recommendations"
  },
  classic: {
    icon: Star,
    color: "from-amber-400 to-yellow-500",
    keywords: ["popular", "favorite", "classic", "bestseller", "traditional", "famous"],
    tags: ["Popular", "Favorite", "Bestseller"],
    description: "Time-tested favorites that everyone loves"
  },
};

export function SmartDiscoveryMenu({
  categories,
  locale,
  addToCart,
  updateQty,
  getQty,
  brandColor,
  canAddItems = true,
  setView,
  tableId,
  sessionId,
  tableNumber,
  restaurantSettings
}: SmartDiscoveryMenuProps) {
  // const t = useTranslations("Customer"); // Removed unused t
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("smart");
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  // const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 }); // Unused state variable
  // Contextual information using the reusable helper
  // AI Chat States
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Enhanced filtering
  const [dietaryFilters, setDietaryFilters] = useState<DietaryFilter>({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    spicy: false,
    lowCalorie: false,
  });
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<"popular" | "price" | "rating" | "name">("popular");

  // Viewport size for responsive discovery
  useEffect(() => {
    const updateSize = () => {
      // setViewportSize({ width: window.innerWidth, height: window.innerHeight }); // Unused state variable
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Enhanced smart context detection
  const contextualInfo = useMemo(() => {
    return generateContextualInfo(restaurantSettings?.name, locale);
  }, [restaurantSettings?.name, locale]);

  // const { timeContext, isHot, isCold, isWeekend, greeting, timeGreeting, weatherSuggestion } = contextualInfo; 
  // Use contextualInfo directly or ensure all destructured vars are used. The linter error suggests these specific two were not.
  // Using them directly from contextualInfo where needed, or ensuring the destructured ones are used.
  // For now, let's use the destructured ones as intended:
  const { timeContext, isHot, isCold, isWeekend, greeting} = contextualInfo;


  // All available items with enhanced filtering
  const allItems = useMemo((): SmartFoodItem[] => {
    const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
    let items: SmartFoodItem[] = categories.flatMap((cat) =>
      cat.menu_items
        .filter((item) => item.available && item.weekday_visibility.includes(today))
        .map((item): SmartFoodItem => ({ 
          ...item, 
          categoryId: cat.id, 
          categoryName: getLocalizedText(cat as unknown as Record<string, unknown>, locale),
          searchText: `${getLocalizedText(item as unknown as Record<string, unknown>, locale)} ${item.description_en || ''} ${item.description_ja || ''} ${item.description_vi || ''}`.toLowerCase(),
          // Add default values for smart discovery features
          rating: 4.0 + Math.random() * 1.0, // Random rating between 4.0-5.0 for demo
          reviewCount: Math.floor(Math.random() * 50) + 5 // Random review count 5-55 for demo
        }))
    );

    // Apply dietary filters
    if (dietaryFilters.vegetarian) {
      items = items.filter(item => item.searchText.includes('vegetarian') || item.searchText.includes('veggie'));
    }
    if (dietaryFilters.vegan) {
      items = items.filter(item => item.searchText.includes('vegan'));
    }
    if (dietaryFilters.glutenFree) {
      items = items.filter(item => item.searchText.includes('gluten-free') || item.searchText.includes('gluten free'));
    }
    if (dietaryFilters.spicy) {
      items = items.filter(item => item.searchText.includes('spicy') || item.searchText.includes('hot'));
    }
    if (dietaryFilters.lowCalorie) {
      items = items.filter(item => item.searchText.includes('light') || item.searchText.includes('low-cal'));
    }

    // Apply price range
    items = items.filter(item => item.price >= priceRange[0] && item.price <= priceRange[1]);

    // Apply sorting
    switch (sortBy) {
      case "price":
        items.sort((a, b) => a.price - b.price);
        break;
      case "rating":
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "name":
        items.sort((a, b) => getLocalizedText(a as unknown as Record<string, unknown>, locale).localeCompare(getLocalizedText(b as unknown as Record<string, unknown>, locale)));
        break;
      default:
        items.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return items;
  }, [categories, locale, dietaryFilters, priceRange, sortBy]);

  // Enhanced smart mood-based filtering
  const getMoodItems = useCallback((mood: MoodType): SmartFoodItem[] => {
    const config = MOOD_CONFIG[mood];
    const itemCountLimit = 8;

    // Get primary items based on keywords
    const primaryKeywordItems = allItems.filter(item => {
      const score = config.keywords.reduce((acc, keyword) => {
        if (item.searchText.includes(keyword)) acc += 1;
        return acc;
      }, 0);
      return score > 0;
    });

    let combinedItems: SmartFoodItem[];

    if (primaryKeywordItems.length < 4) { // Condition to add fallback items
      const primaryItemIds = new Set(primaryKeywordItems.map(item => item.id)); // Get IDs of primary items

      const fallbackCategoryItems = allItems.filter(item => {
        // Ensure fallback items are not ALREADY in primaryKeywordItems
        if (primaryItemIds.has(item.id)) {
          return false; 
        }
        // Category-based filtering for fallback
        switch (mood) {
          case "quick": return item.categoryName.toLowerCase().includes("snack") || item.categoryName.toLowerCase().includes("appetizer");
          case "comfort": return item.categoryName.toLowerCase().includes("main") || item.categoryName.toLowerCase().includes("soup");
          case "healthy": return item.categoryName.toLowerCase().includes("salad") || item.categoryName.toLowerCase().includes("vegetable");
          case "indulgent": return item.categoryName.toLowerCase().includes("dessert") || item.categoryName.toLowerCase().includes("beverage");
          default: return true; // This default might be broad, but matches original logic pattern
        }
      });
      
      const numFallbackToAdd = Math.max(0, itemCountLimit - primaryKeywordItems.length);
      combinedItems = [...primaryKeywordItems, ...fallbackCategoryItems.slice(0, numFallbackToAdd)];
    } else {
      // Enough primary items, or more than enough; no fallbacks needed initially.
      combinedItems = primaryKeywordItems;
    }

    // Deduplicate the combined list to ensure unique keys
    const uniqueItems = Array.from(new Map(combinedItems.map(item => [item.id, item])).values());
    
    // Slice to the final limit after deduplication
    return uniqueItems.slice(0, itemCountLimit);
  }, [allItems]);

  // Enhanced trending items with better logic
  const trendingItems = useMemo((): SmartFoodItem[] => {
    return allItems
      .filter(item => (item.reviewCount || 0) > 0)
      .sort((a, b) => {
        const aScore = (a.reviewCount || 0) * (a.rating || 0);
        const bScore = (b.reviewCount || 0) * (b.rating || 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  }, [allItems]);

  // Enhanced contextual recommendations
  const smartRecommendations = useMemo((): SmartFoodItem[] => {
    const items = [...allItems]; // Changed to const
    const contextScore = new Map<string, number>(); // Changed to const

    // Initialize all items with base score
    items.forEach(item => contextScore.set(item.id, 0));

    // Time-based scoring
    items.forEach(item => {
      let score = contextScore.get(item.id) || 0;
      
      if (timeContext === "breakfast" &&
          /breakfast|coffee|morning|pastry|egg|toast|cereal|pancake/.test(item.searchText)) {
        score += 3;
      } else if (timeContext === "lunch" &&
                 /lunch|sandwich|salad|quick|bowl|wrap|burger/.test(item.searchText)) {
        score += 3;
      } else if (timeContext === "dinner" &&
                 /dinner|main|meal|pasta|rice|meat|fish|steak/.test(item.searchText)) {
        score += 3;
      } else if (timeContext === "late" &&
                 /snack|light|quick|dessert|drink/.test(item.searchText)) {
        score += 2;
      }

      // Weather-based scoring
      if (isHot && /cold|ice|salad|fresh|cool|drink|smoothie/.test(item.searchText)) {
        score += 2;
      } else if (isCold && /hot|warm|soup|tea|coffee|stew|curry/.test(item.searchText)) {
        score += 2;
      }

      // Weekend boost for indulgent items
      if (isWeekend && /dessert|special|premium|signature/.test(item.searchText)) {
        score += 1;
      }

      // Popularity boost
      score += Math.min((item.reviewCount || 0) / 10, 2);
      score += Math.min((item.rating || 0), 5);

      contextScore.set(item.id, score);
    });

    return items
      .sort((a, b) => (contextScore.get(b.id) || 0) - (contextScore.get(a.id) || 0))
      .slice(0, 8);
  }, [allItems, timeContext, isHot, isCold, isWeekend]);

  // AI Chat Functions
  const simulateAIResponse = useCallback(async (userMessage: string): Promise<{ response: string; suggestions: FoodItem[] }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const message = userMessage.toLowerCase();
    let suggestions: FoodItem[] = [];
    let response = "";

    // Simple keyword matching for demo - replace with actual AI integration
    if (message.includes("spicy") || message.includes("hot")) {
      suggestions = allItems.filter(item => 
        item.searchText.includes("spicy") || item.searchText.includes("hot") || item.searchText.includes("chili")
      ).slice(0, 4);
      response = "I found some delicious spicy options for you! These dishes will definitely bring the heat. Would you like to try any of these?";
    } else if (message.includes("vegetarian") || message.includes("veggie")) {
      suggestions = allItems.filter(item => 
        item.searchText.includes("vegetarian") || item.searchText.includes("veggie") || item.searchText.includes("plant")
      ).slice(0, 4);
      response = "Here are some wonderful vegetarian dishes! All fresh, flavorful, and satisfying. Which one catches your eye?";
    } else if (message.includes("quick") || message.includes("fast")) {
      suggestions = getMoodItems("quick").slice(0, 4);
      response = "Perfect! Here are some quick options that are ready in no time. All of these are fast without compromising on taste.";
    } else if (message.includes("dessert") || message.includes("sweet")) {
      suggestions = allItems.filter(item => 
        item.categoryName.toLowerCase().includes("dessert") || item.searchText.includes("sweet") || item.searchText.includes("chocolate")
      ).slice(0, 4);
      response = "Time for something sweet! These desserts are absolutely divine. Life&apos;s too short to skip dessert! 🍰";
    } else if (message.includes("healthy") || message.includes("light")) {
      suggestions = getMoodItems("healthy").slice(0, 4);
      response = "Great choice! These healthy options are both nutritious and delicious. Perfect for keeping you energized and satisfied.";
    } else if (message.includes("popular") || message.includes("recommend")) {
      suggestions = trendingItems.slice(0, 4);
      response = "Here are our most popular dishes! These are customer favorites and highly rated. You really can&apos;t go wrong with any of these.";
    } else {
      // Contextual fallback
      suggestions = smartRecommendations.slice(0, 4);
      response = `Based on what you&apos;re looking for and the time of day, I&apos;d recommend these dishes. They&apos;re perfect for ${greeting.toLowerCase()}. What do you think?`;
    }

    return { response, suggestions };
  }, [allItems, getMoodItems, trendingItems, smartRecommendations, greeting]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsAITyping(true);

    try {
      const { response, suggestions } = await simulateAIResponse(chatInput);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        suggestions,
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
	  console.error("AI response error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I&apos;m sorry, I&apos;m having trouble understanding right now. Could you try asking again?",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAITyping(false);
    }
  }, [chatInput, simulateAIResponse, setChatMessages, setIsAITyping, setChatInput]); // Added setChatInput

  // Voice Input Functionality not implemented for now,
  // but can be added later if needed.
  
  const initializeAIChat = useCallback(() => {
    if (chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: `Hi! I'm your food assistant 🤖 I can help you find the perfect dish based on your preferences, dietary needs, or mood. What are you in the mood for today?`,
        timestamp: new Date(),
        suggestions: smartRecommendations.slice(0, 3),
      };
      setChatMessages([welcomeMessage]);
    }
    setShowAIChat(true);
  }, [chatMessages.length, smartRecommendations, setShowAIChat, setChatMessages]); // Added dependencies

  const handleAddToCart = (item: FoodItem) => {
    if (canAddItems) {
      // Check if item has sizes or toppings - if so, redirect to detail view instead
      const hasSizes = item.menu_item_sizes && item.menu_item_sizes.length > 0;
      const hasToppings = item.toppings && item.toppings.length > 0;
      
      if (hasSizes || hasToppings) {
        // Redirect to item detail view for customization
        setView('menuitemdetail', { item, tableId, sessionId, tableNumber });
        return;
      }
      
      addToCart(item);
    }
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (canAddItems && updateQty) {
      updateQty(id, qty);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Enhanced Discovery Mode Selector */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { mode: "ai" as DiscoveryMode, label: "AI Assistant", icon: Bot, badge: "New" },
            { mode: "smart" as DiscoveryMode, label: "Smart Picks", icon: Sparkles },
            { mode: "mood" as DiscoveryMode, label: "By Mood", icon: Heart },
            { mode: "trending" as DiscoveryMode, label: "Trending", icon: TrendingUp },
            { mode: "visual" as DiscoveryMode, label: "Visual Browse", icon: Camera },
          ].map(({ mode, label, icon: Icon, badge }) => (
            <Button
              key={mode}
              variant={discoveryMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDiscoveryMode(mode);
                if (mode === "ai") initializeAIChat();
              }}
              className="flex-shrink-0 relative"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
              {badge && (
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                  {badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {discoveryMode === "ai" && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4"
          >
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-0">
                {/* Chat Header */}
                <div className="border-b p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Food Assistant</h3>
                      <p className="text-sm text-slate-600">Ask me anything about our menu!</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAIChat(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-96 p-4" ref={chatScrollRef}>
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user" 
                            ? "bg-blue-500 text-white" 
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.suggestions.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-slate-700 rounded-lg p-2 border">
                                  <div className="flex items-center space-x-3">
                                    <Image
                                      src={item.image_url || '/placeholder-food.png'}
                                      alt={getLocalizedText(item as unknown as Record<string, unknown>, locale)}
                                      width={40}
                                      height={40}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                                        {getLocalizedText(item as unknown as Record<string, unknown>, locale)}
                                      </h4>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">¥{item.price}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddToCart(item)}
                                      disabled={!canAddItems}
                                      style={{ backgroundColor: brandColor }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isAITyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-slate-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me about food preferences, dietary needs, or recommendations..."
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!chatInput.trim() || isAITyping}
                      style={{ backgroundColor: brandColor }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["What's spicy?", "Vegetarian options", "Quick bites", "Popular dishes"].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setChatInput(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {discoveryMode === "smart" && (
          <motion.div
            key="smart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Perfect for you right now</h2>
              <p className="text-slate-600 dark:text-slate-400">
                AI-curated based on time, weather, and trending favorites
              </p>
            </div>

            {/* Filters Section */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3">Refine Your Search</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block mb-1 text-sm font-medium">Dietary Options</Label>
                  <div className="space-y-2">
                    {Object.keys(dietaryFilters).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`diet-${key}`}
                          checked={dietaryFilters[key as keyof DietaryFilter]}
                          onCheckedChange={(checked) =>
                            setDietaryFilters((prev) => ({ ...prev, [key]: !!checked }))
                          }
                        />
                        <Label htmlFor={`diet-${key}`} className="capitalize text-sm">
                          {key.replace(/([A-Z])/g, ' $1')} {/* e.g. glutenFree -> gluten Free */}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="price-min" className="block mb-1 text-sm font-medium">Price Range (¥)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      id="price-min"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      placeholder="Min"
                      className="w-full"
                    />
                    <span className="text-slate-500">-</span>
                    <Input
                      type="number"
                      id="price-max"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      placeholder="Max"
                      className="w-full"
                    />
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="sort-by" className="block mb-1 text-sm font-medium">Sort By</Label>
					
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as "popular" | "price" | "rating" | "name")}>
                      <SelectTrigger id="sort-by">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">Popularity</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartRecommendations.map((item) => (
                <FoodCard
                  key={item.id}
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
              ))}
            </div>
          </motion.div>
        )}

        {discoveryMode === "mood" && (
          <motion.div
            key="mood"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4"
          >
            {!selectedMood ? (
              /* Enhanced Mood Selection */
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-center mb-6">
                  What&apos;s your mood today?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					
                  {(Object.entries(MOOD_CONFIG) as [MoodType, moodConfig][]).map(([mood, config]) => (
                    <motion.button
                      key={mood}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMood(mood)}
                      className="relative overflow-hidden rounded-2xl p-6 text-white aspect-[4/3] flex flex-col items-center justify-center space-y-3"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${config.color}`} />
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="relative z-10 flex flex-col items-center space-y-3 text-center">
                        <config.icon className="h-8 w-8" />
                        <span className="font-semibold text-lg capitalize">{mood}</span>
                        <p className="text-sm opacity-90 px-2">{config.description}</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {config.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs bg-white/20">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              /* Enhanced Mood Results */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMood(null)}
                    >
                      ← Back
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold capitalize">
                        {selectedMood} vibes
                      </h2>
                      <p className="text-sm text-slate-600">
                        {MOOD_CONFIG[selectedMood].description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMood(null)}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Try Another
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getMoodItems(selectedMood).map((item) => (
                    <FoodCard
                      key={item.id}
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
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {discoveryMode === "trending" && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>What&apos;s Hot</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Customer favorites and highest-rated dishes
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingItems.map((item, index) => (
                <div key={item.id} className="relative">
                  {index < 3 && (
                    <Badge 
                      className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                    >
                      #{index + 1}
                    </Badge>
                  )}
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
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {discoveryMode === "visual" && (
          <motion.div
            key="visual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Browse by Look</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Visual discovery of all our dishes
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allItems.slice(0, 16).map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className="aspect-square"
                >
                  <Card 
                    className="h-full p-0 overflow-hidden cursor-pointer"
                    onClick={() => setView("menuitemdetail", { item, tableId, sessionId, tableNumber })}
                  >
                    <div className="relative h-full">
                      <Image
                        src={item.image_url || '/placeholder-food.png'}
                        alt={getLocalizedText(item as unknown as Record<string, unknown>, locale)}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                        objectFit="cover" // Added for next/image
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {getLocalizedText(item as unknown as Record<string, unknown>, locale)}
                        </h3>
                        <div className="flex items-center justify-between">
                          <p className="text-white/80 text-xs">¥{item.price}</p>
                          {item.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-white/80 text-xs">{item.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={() => setView("menu")}
                className="mt-4"
              >
                See All Items
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Quick Access Footer */}
      <div className="px-4 py-8 border-t border-slate-200 dark:border-slate-700 mt-8">
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => initializeAIChat()}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask AI Assistant
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setView("menu")}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Full Menu
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedMood("adventure")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Surprise Me
            </Button>
          </div>
        </div>
      </div>

      {/* Floating AI Chat Button */}
      {!showAIChat && discoveryMode !== "ai" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={initializeAIChat}
            className="rounded-full w-14 h-14 shadow-lg"
            style={{ backgroundColor: brandColor }}
          >
            <Bot className="h-6 w-6" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}