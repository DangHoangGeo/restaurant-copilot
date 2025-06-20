"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  QrCode,
  Menu as MenuIcon,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Bot,
  MessageCircle,
  Award,
  Users,
  Heart,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Button, Card, Icon } from '../../../home';
import { useTranslations } from 'next-intl';
import { CustomerHeader } from '../layout/CustomerHeader';
import { CustomerFooter } from '../layout/CustomerFooter';

// Types for restaurant data
interface OpeningHours {
  [key: string]: {
    isOpen?: boolean;
    isClosed?: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

interface RestaurantData {
  restaurant: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl?: string | null;
    defaultLocale?: string;
    contactInfo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    description_en?: string | null;
    description_ja?: string | null;
    description_vi?: string | null;
    opening_hours?: Record<string, string>;
    social_links?: Record<string, string>;
    timezone?: string;
    currency?: string;
    payment_methods?: string[];
    delivery_options?: string[];
    primaryColor?: string;
    secondaryColor?: string;
  };
  menu: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    menu_items?: Array<{
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    }>;
  }>;
}

interface RestaurantHomepageProps {
  subdomain: string;
  locale: string;
}

// Restaurant Homepage Component - shown when subdomain is detected
export const RestaurantHomepage = ({ subdomain, locale }: RestaurantHomepageProps) => {
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const tCustomer = useTranslations('customer.home');
  const tCommon = useTranslations('common');
  const [selectedLocale, setSelectedLocale] = useState(locale);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/restaurant/data?subdomain=${subdomain}`);
        
        if (!response.ok) {
          throw new Error('Restaurant not found');
        }
        
        const data = await response.json();
        setRestaurantData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [subdomain]);

  // Apply restaurant brand color
  useEffect(() => {
    if (restaurantData?.restaurant?.primaryColor) {
      document.documentElement.style.setProperty('--brand-color', restaurantData.restaurant.primaryColor);
    }
  }, [restaurantData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !restaurantData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4 text-slate-800 dark:text-slate-100">{tCustomer("restaurant_not_found")}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {tCustomer("restaurant_not_found_description", { subdomain })}
          </p>
          <Button href="/" variant="primary" onClick={() => {}} iconLeft={null} iconRight={null}>
            {tCommon("go_to_homepage")}
          </Button>
        </div>
      </div>
    );
  }

  const { restaurant, menu } = restaurantData;
  const primaryColor = restaurant.primaryColor || '#3B82F6';

  // Parse opening hours
  const getOpeningHours = (): OpeningHours | null => {
    if (!restaurant?.opening_hours) return null;
    
    try {
      const hours = typeof restaurant.opening_hours === 'string' 
        ? JSON.parse(restaurant.opening_hours)
        : restaurant.opening_hours;
      return hours as OpeningHours;
    } catch {
      return null;
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative" style={{ '--brand-color': primaryColor } as React.CSSProperties}>
      <CustomerHeader
        restaurantSettings={restaurantData?.restaurant || {}}
        onCartClick={() => {}}
        currentLocale={selectedLocale}
        onLocaleChange={setSelectedLocale}
        onOrderHistoryClick={() => {}}
        cartItemCount={0} // Placeholder, replace with actual cart item count
        showOrderHistory={ false} // Placeholder, replace with actual state
      />

      {/* Enhanced Hero Section with Context and Animations */}
      <section className="relative bg-gradient-to-br from-[var(--brand-color)] via-[var(--brand-color)]/90 to-[var(--brand-color)]/80 text-white py-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <motion.div
            className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full"
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
  
          {/* Main Restaurant Title with Animation */}
          <motion.h2 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {tCustomer("welcome_to")} <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{restaurant.name}</span>
          </motion.h2>

          {/* Restaurant Description with Stagger Animation */}
          {(restaurant.description_en || restaurant.description_ja || restaurant.description_vi) && (
            <motion.p 
              className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {locale === 'ja' ? restaurant.description_ja : 
               locale === 'vi' ? restaurant.description_vi : 
               restaurant.description_en}
            </motion.p>
          )}
          
          {/* Action Buttons with Enhanced Animations */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                href={`/${locale}/menu`} 
                size="xl" 
                className="bg-white text-[var(--brand-color)] hover:bg-slate-100 font-semibold px-8 py-4 shadow-xl group"
                onClick={() => {}}
                iconLeft={MenuIcon}
                iconRight={null}
              >
                <span className="group-hover:mr-2 transition-all">{tCustomer("view_menu")}</span>
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all" />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                href={`/${locale}/booking`}
                size="xl" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white hover:text-[var(--brand-color)] font-semibold px-8 py-4 shadow-xl backdrop-blur-sm group"
                onClick={() => {}}
                iconLeft={CalendarDays}
                iconRight={null}
              >
                <span className="group-hover:mr-2 transition-all">Make Reservation</span>
                <Sparkles className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Hidden AI Assistant Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className="opacity-20 hover:opacity-60 transition-opacity duration-300"
            >
              <Bot className="h-6 w-6 text-white" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Main Content with Animations */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Interactive Restaurant Info Cards */}
        <div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Enhanced Contact Information Card */}
          {(restaurant.address || restaurant.phone || restaurant.email || restaurant.website) && (
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:border-2 hover:border-[var(--brand-color)]/20 transition-all shadow-lg hover:shadow-xl">
                <div className="p-6">
                  <motion.h3 
                    className="text-lg font-semibold mb-4 flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon name={MapPin} size={20} className="mr-2 text-[var(--brand-color)]" />
                    </motion.div>
                    {tCustomer("contact_information")}
                  </motion.h3>
                  <div className="space-y-3">
                    {restaurant.address && (
                      <motion.div 
                        className="flex items-start space-x-3 group hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-all"
                        whileHover={{ x: 4 }}
                      >
                        <Icon name={MapPin} size={16} className="mt-1 text-slate-500 group-hover:text-[var(--brand-color)] transition-colors" />
                        <span className="text-sm">{restaurant.address}</span>
                      </motion.div>
                    )}
                    
                    {restaurant.phone && (
                      <motion.div 
                        className="flex items-center space-x-3 group hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-all"
                        whileHover={{ x: 4 }}
                      >
                        <Icon name={Phone} size={16} className="text-slate-500 group-hover:text-[var(--brand-color)] transition-colors" />
                        <a href={`tel:${restaurant.phone}`} className="text-sm hover:text-[var(--brand-color)] transition-colors">
                          {restaurant.phone}
                        </a>
                      </motion.div>
                    )}
                    
                    {restaurant.email && (
                      <motion.div 
                        className="flex items-center space-x-3 group hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-all"
                        whileHover={{ x: 4 }}
                      >
                        <Icon name={Mail} size={16} className="text-slate-500 group-hover:text-[var(--brand-color)] transition-colors" />
                        <a href={`mailto:${restaurant.email}`} className="text-sm hover:text-[var(--brand-color)] transition-colors">
                          {restaurant.email}
                        </a>
                      </motion.div>
                    )}
                    
                    {restaurant.website && (
                      <motion.div 
                        className="flex items-center space-x-3 group hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-all"
                        whileHover={{ x: 4 }}
                      >
                        <Icon name={Globe} size={16} className="text-slate-500 group-hover:text-[var(--brand-color)] transition-colors" />
                        <a 
                          href={restaurant.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm hover:text-[var(--brand-color)] transition-colors"
                        >
                          {tCustomer("visit_website")}
                        </a>
                      </motion.div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Opening Hours Card */}
          {getOpeningHours() && (
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 hover:border-[var(--brand-color)]/20 transition-all shadow-lg hover:shadow-xl">
                <div className="p-6">
                  <motion.h3 
                    className="text-lg font-semibold mb-4 flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Icon name={Clock} size={20} className="mr-2 text-[var(--brand-color)]" />
                    </motion.div>
                    {tCustomer("opening_hours")}
                  </motion.h3>
                  <div className="space-y-2">
                    {Object.entries(getOpeningHours() || {}).map(([day, hours]: [string, OpeningHours[string]], index) => (
                      <motion.div 
                        key={day} 
                        className="flex justify-between text-sm hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="capitalize font-medium">{day}</span>
                        <span className={`${hours.isClosed || !hours.isOpen ? 'text-red-500' : 'text-green-600'}`}>
                          {hours.isClosed || !hours.isOpen
                            ? 'Closed'
                            : `${hours.openTime} - ${hours.closeTime}`
                          }
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Quick Actions Card */}
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 hover:border-[var(--brand-color)]/20 transition-all shadow-lg hover:shadow-xl">
              <div className="p-6">
                <motion.h3 
                  className="text-lg font-semibold mb-4 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Icon name={QrCode} size={20} className="mr-2 text-[var(--brand-color)]" />
                  </motion.div>
                  {tCustomer("quick_actions")}
                </motion.h3>
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      href={`/${locale}/menu?scan=true`} 
                      variant="outline" 
                      size="sm" 
                      className="w-full group hover:bg-[var(--brand-color)] hover:text-white transition-all"
                      onClick={() => {}}
                      iconLeft={QrCode}
                      iconRight={null}
                    >
                      <span className="group-hover:mr-2 transition-all">{tCustomer("scan_qr_code")}</span>
                      <Zap className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      href={`/${locale}/menu`} 
                      variant="outline" 
                      size="sm" 
                      className="w-full group hover:bg-[var(--brand-color)] hover:text-white transition-all"
                      onClick={() => {}}
                      iconLeft={MenuIcon}
                      iconRight={null}
                    >
                      <span className="group-hover:mr-2 transition-all">Browse Menu</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      href={`/${locale}/booking`} 
                      variant="outline" 
                      size="sm" 
                      className="w-full group hover:bg-[var(--brand-color)] hover:text-white transition-all"
                      onClick={() => {}}
                      iconLeft={CalendarDays}
                      iconRight={null}
                    >
                      <span className="group-hover:mr-2 transition-all">{tCustomer("book_table")}</span>
                      <Heart className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Featured Menu Categories */}
        {menu && menu.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <motion.h3 
              className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
            >
              Our Menu
            </motion.h3>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.slice(0, 6).map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.3 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 hover:border-[var(--brand-color)]/30 group overflow-hidden">
                    {/* Category Background Pattern */}
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                      <div className="w-full h-full bg-gradient-to-br from-[var(--brand-color)] to-transparent"></div>
                    </div>
                    
                    <div className="p-6 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <motion.h4 
                            className="font-semibold text-xl mb-2 group-hover:text-[var(--brand-color)] transition-colors"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4 + index * 0.1 }}
                          >
                            {locale === 'ja' ? category.name_ja : 
                             locale === 'vi' ? category.name_vi : 
                             category.name_en}
                          </motion.h4>
                          <motion.div 
                            className="flex items-center space-x-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5 + index * 0.1 }}
                          >
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {category.menu_items?.length || 0} items
                            </p>
                            <motion.div
                              className="h-1 w-8 bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/50 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: 32 }}
                              transition={{ delay: 1.6 + index * 0.1, duration: 0.5 }}
                            />
                          </motion.div>
                          
                          {/* Popular Badge for first few items */}
                          {index < 3 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 1.7 + index * 0.1, type: "spring" }}
                              className="mt-2"
                            >
                              <div className="inline-flex items-center space-x-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full text-xs">
                                <Award className="h-3 w-3" />
                                <span>{tCustomer("popular")}</span>
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Icon name={ChevronRight} size={20} className="text-[var(--brand-color)] opacity-60 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              className="text-center mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  href={`/${locale}/menu`} 
                  size="lg" 
                  className="bg-[var(--brand-color)] hover:opacity-90 shadow-xl group relative overflow-hidden"
                  onClick={() => {}}
                  iconLeft={null}
                  iconRight={ChevronRight}
                >
                  {/* Animated background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                  <span className="relative group-hover:mr-2 transition-all">{tCustomer("view_full_menu")}</span>
                  <Users className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all relative" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.section>
        )}
      </main>

      {/* Hidden AI Assistant Modal */}
      <AnimatePresence>
        {showAIAssistant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIAssistant(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-[var(--brand-color)] to-[var(--brand-color)]/70 rounded-full flex items-center justify-center"
                >
                  <Bot className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold">{tCustomer("ai_assistant")}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {tCustomer("ai_assistant_description")}
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <Sparkles className="h-4 w-4" />
                  <span>{tCustomer("smart_recommendations")}</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <MessageCircle className="h-4 w-4" />
                  <span>{tCustomer("interactive_chat")}</span>
                </div>
                <Button
                  onClick={() => setShowAIAssistant(false)}
                  className="w-full"
                >
                  {tCustomer("got_it")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CustomerFooter restaurantSettings={restaurantData?.restaurant || {}} />
    </div>
  );
};
