"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Clock, ThermometerSun, Snowflake, Heart, 
  Zap, Coffee, Soup, Salad, Pizza, Camera, Search,
  TrendingUp, Star, Users, MapPin, Shuffle, ChevronRight,
  Bot, Send, Mic, MicOff, MessageCircle, X, Loader2,
  Filter, SortAsc, Eye, Utensils, Flame, Leaf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoodCard, FoodItem } from "./FoodCard";
import { getLocalizedText } from "./utils";
import type { ViewType, ViewProps } from "./screens/types";

interface Category {
  id: string;
  position: number;
  name_en: string;
  name_ja: string;
  name_vi: string;
  menu_items: FoodItem[];
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
    tags: ["Signature", "Unique", "Chef's Special"],
    description: "Unique creations and chef's special recommendations"
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
}: SmartDiscoveryMenuProps) {
  const t = useTranslations("Customer");
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("smart");
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  
  // AI Chat States
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  // Update time every minute for contextual recommendations
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Viewport size for responsive discovery
  useEffect(() => {
    const updateSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
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
    const hour = currentTime.getHours();
    const isWeekend = [0, 6].includes(currentTime.getDay());
    const temp = Math.floor(Math.random() * 30) + 10; // Mock weather, could integrate API

    let timeContext = "other";
    let timeGreeting = "";
    if (hour >= 6 && hour < 11) {
      timeContext = "breakfast";
      timeGreeting = "Start your day right";
    } else if (hour >= 11 && hour < 15) {
      timeContext = "lunch";
      timeGreeting = "Perfect lunch time";
    } else if (hour >= 15 && hour < 17) {
      timeContext = "afternoon";
      timeGreeting = "Afternoon pick-me-up";
    } else if (hour >= 17 && hour < 22) {
      timeContext = "dinner";
      timeGreeting = "Dinner time delights";
    } else {
      timeContext = "late";
      timeGreeting = "Late night cravings";
    }

    return {
      timeContext,
      timeGreeting,
      isWeekend,
      temperature: temp,
      isHot: temp > 25,
      isCold: temp < 15,
      greeting: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening",
      weatherSuggestion: temp > 25 ? "Something cool and refreshing" : temp < 15 ? "Something warm and comforting" : "Whatever matches your mood",
    };
  }, [currentTime]);

  // All available items with enhanced filtering
  const allItems = useMemo(() => {
    const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
    let items = categories.flatMap((cat) =>
      cat.menu_items
        .filter((item) => item.available && item.weekday_visibility.includes(today))
        .map((item) => ({ 
          ...item, 
          categoryId: cat.id, 
          categoryName: getLocalizedText(cat as any, locale),
          searchText: `${getLocalizedText(item as any, locale)} ${item.description_en || ''} ${item.description_ja || ''} ${item.description_vi || ''}`.toLowerCase()
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
        items.sort((a, b) => getLocalizedText(a as any, locale).localeCompare(getLocalizedText(b as any, locale)));
        break;
      default:
        items.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return items;
  }, [categories, locale, dietaryFilters, priceRange, sortBy]);

  // Enhanced smart mood-based filtering
  const getMoodItems = (mood: MoodType) => {
    const config = MOOD_CONFIG[mood];
    const filteredItems = allItems.filter(item => {
      const score = config.keywords.reduce((acc, keyword) => {
        if (item.searchText.includes(keyword)) acc += 1;
        return acc;
      }, 0);
      return score > 0;
    });

    // If no specific matches, fall back to category-based suggestions
    if (filteredItems.length < 4) {
      const fallbackItems = allItems.filter(item => {
        switch (mood) {
          case "quick": return item.categoryName.toLowerCase().includes("snack") || item.categoryName.toLowerCase().includes("appetizer");
          case "comfort": return item.categoryName.toLowerCase().includes("main") || item.categoryName.toLowerCase().includes("soup");
          case "healthy": return item.categoryName.toLowerCase().includes("salad") || item.categoryName.toLowerCase().includes("vegetable");
          case "indulgent": return item.categoryName.toLowerCase().includes("dessert") || item.categoryName.toLowerCase().includes("beverage");
          default: return true;
        }
      });
      return [...filteredItems, ...fallbackItems.slice(0, 8 - filteredItems.length)];
    }

    return filteredItems.slice(0, 8);
  };

  // Enhanced trending items with better logic
  const trendingItems = useMemo(() => {
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
  const smartRecommendations = useMemo(() => {
    let items = [...allItems];
    let contextScore = new Map<string, number>();

    // Initialize all items with base score
    items.forEach(item => contextScore.set(item.id, 0));

    // Time-based scoring
    items.forEach(item => {
      let score = contextScore.get(item.id) || 0;
      
      if (contextualInfo.timeContext === "breakfast" && 
          /breakfast|coffee|morning|pastry|egg|toast|cereal|pancake/.test(item.searchText)) {
        score += 3;
      } else if (contextualInfo.timeContext === "lunch" && 
                 /lunch|sandwich|salad|quick|bowl|wrap|burger/.test(item.searchText)) {
        score += 3;
      } else if (contextualInfo.timeContext === "dinner" && 
                 /dinner|main|meal|pasta|rice|meat|fish|steak/.test(item.searchText)) {
        score += 3;
      } else if (contextualInfo.timeContext === "late" && 
                 /snack|light|quick|dessert|drink/.test(item.searchText)) {
        score += 2;
      }

      // Weather-based scoring
      if (contextualInfo.isHot && /cold|ice|salad|fresh|cool|drink|smoothie/.test(item.searchText)) {
        score += 2;
      } else if (contextualInfo.isCold && /hot|warm|soup|tea|coffee|stew|curry/.test(item.searchText)) {
        score += 2;
      }

      // Weekend boost for indulgent items
      if (contextualInfo.isWeekend && /dessert|special|premium|signature/.test(item.searchText)) {
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
  }, [allItems, contextualInfo]);

  // AI Chat Functions
  const simulateAIResponse = async (userMessage: string): Promise<{ response: string; suggestions: FoodItem[] }> => {
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
      response = "Time for something sweet! These desserts are absolutely divine. Life's too short to skip dessert! 🍰";
    } else if (message.includes("healthy") || message.includes("light")) {
      suggestions = getMoodItems("healthy").slice(0, 4);
      response = "Great choice! These healthy options are both nutritious and delicious. Perfect for keeping you energized and satisfied.";
    } else if (message.includes("popular") || message.includes("recommend")) {
      suggestions = trendingItems.slice(0, 4);
      response = "Here are our most popular dishes! These are customer favorites and highly rated. You really can't go wrong with any of these.";
    } else {
      // Contextual fallback
      suggestions = smartRecommendations.slice(0, 4);
      response = `Based on what you're looking for and the time of day, I'd recommend these dishes. They're perfect for ${contextualInfo.timeGreeting.toLowerCase()}. What do you think?`;
    }

    return { response, suggestions };
  };

  const handleSendMessage = async () => {
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
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble understanding right now. Could you try asking again?",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale === 'ja' ? 'ja-JP' : locale === 'vi' ? 'vi-VN' : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser');
    }
  };

  const initializeAIChat = () => {
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
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Enhanced Hero Section with Context */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative px-4 py-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {contextualInfo.timeGreeting}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {contextualInfo.weatherSuggestion}
              {contextualInfo.isWeekend && " • Perfect weekend vibes"}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{contextualInfo.timeContext}</span>
              </div>
              <div className="flex items-center space-x-1">
                {contextualInfo.isHot ? <ThermometerSun className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
                <span>{contextualInfo.temperature}°C</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

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
                                    <img
                                      src={item.image_url || 'https://placehold.co/40x40/E2E8F0/334155?text=Food'}
                                      alt={getLocalizedText(item as any, locale)}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                                        {getLocalizedText(item as any, locale)}
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
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startVoiceInput}
                      disabled={isListening}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
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
                  What's your mood today?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.entries(MOOD_CONFIG) as [MoodType, any][]).map(([mood, config]) => (
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
                <span>What's Hot</span>
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
                      <img
                        src={item.image_url || 'https://placehold.co/200x200/E2E8F0/334155?text=Food'}
                        alt={getLocalizedText(item as any, locale)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {getLocalizedText(item as any, locale)}
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
            Can't find what you're looking for?
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