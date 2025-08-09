"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

// Import all homepage sections
import { HeroSection } from "../homepage/HeroSection";
import { OwnerStorySection } from "../homepage/OwnerStorySection";
import { GallerySection } from "../homepage/GallerySection";
import { SignatureDishesSection } from "../homepage/SignatureDishesSection";
import { ReviewsMapSection } from "../homepage/ReviewsMapSection";
import { ContactHoursSection } from "../homepage/ContactHoursSection";
import { RestaurantData } from "@/shared/types";

// Types


interface Owner {
  id: string;
  name?: string | null;
  email: string;
  photo_url?: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string | null;
  alt_text: string;
  sort_order: number;
  is_hero: boolean;
}

interface SignatureDish {
  id: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  price: number;
  image_url?: string | null;
  category_name_en?: string;
  category_name_ja?: string;
  category_name_vi?: string;
}

interface HomepageData {
  restaurant: RestaurantData;
  owners: Owner[];
  gallery: GalleryImage[];
  signature_dishes: SignatureDish[];
}

interface NewHomePageProps {
  subdomain?: string;
  locale?: string;
  isAdmin?: boolean;
  isAdminPreview?: boolean;
  initialData?: HomepageData | null;
}

// Helper functions
function getToday() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function isOpenNow(hours: Record<string, { isClosed?: boolean; openTime?: string; closeTime?: string }>): { open: boolean; closesAt?: string } {
  const now = new Date();
  const today = getToday();
  const todayHours = hours?.[today];
  
  if (!todayHours || todayHours.isClosed) return { open: false };
  
  try {
    const [h, m] = todayHours.openTime?.split(":") ?? [0, 0];
    const [ch, cm] = todayHours.closeTime?.split(":") ?? [23, 59];
    const openMinutes = Number(h) * 60 + Number(m);
    const closeMinutes = Number(ch) * 60 + Number(cm);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    return {
      open: nowMinutes >= openMinutes && nowMinutes < closeMinutes,
      closesAt: todayHours.closeTime,
    };
  } catch {
    return { open: false };
  }
}

export function NewHomePage({ subdomain, locale = 'en', isAdmin = false, isAdminPreview = false, initialData = null }: NewHomePageProps) {
  const [homepageData, setHomepageData] = useState<HomepageData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  
  const t = useTranslations("customer.home");

  useEffect(() => {
    // Skip fetch if we already have initial data
    if (initialData) {
      return;
    }

    const fetchHomepageData = async () => {
      try {
        setLoading(true);
        
        let response;
        if (isAdminPreview) {
          // For admin preview, get data from authenticated restaurant context
          response = await fetch('/api/v1/restaurant/homepage-data');
        } else {
          // For public view, get data by subdomain
          response = await fetch(`/api/v1/restaurant/data?subdomain=${subdomain}`);
        }
        
        if (!response.ok) {
          throw new Error('Restaurant not found');
        }
        
        const data = await response.json();
        
        // Transform data to match our interface
        const transformedData: HomepageData = {
          restaurant: {
            ...data.restaurant,
            logoUrl: data.restaurant.logo_url,
          },
          owners: data.owners || [],
          gallery: data.gallery || [],
          signature_dishes: data.signature_dishes || [],
        };
        
        setHomepageData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if we have subdomain or are in admin preview mode
    if (subdomain || isAdminPreview) {
      fetchHomepageData();
    }
  }, [subdomain, isAdminPreview, initialData]);

  // Apply restaurant brand color to CSS custom property
  useEffect(() => {
    if (homepageData?.restaurant?.primaryColor) {
      document.documentElement.style.setProperty('--brand-color', homepageData.restaurant.primaryColor);
    }
  }, [homepageData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Loading Skeleton */}
        <div className="animate-pulse">
          {/* Hero Skeleton */}
          <div className="h-96 bg-gradient-to-r from-slate-200 to-slate-300"></div>
          
          {/* Content Skeleton */}
          <div className="px-4 py-12 space-y-12">
            <div className="max-w-4xl mx-auto">
              <div className="h-8 bg-slate-200 rounded-lg mb-4 w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !homepageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-slate-800">
            {t("restaurant_not_found") || "Restaurant Not Found"}
          </h1>
          <p className="text-slate-600 mb-6">
            {error || "We couldn't find the restaurant you're looking for. It may have been moved or doesn't exist."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            {t("try_again") || "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { restaurant, owners, gallery, signature_dishes } = homepageData;
  
  // Parse opening hours
  const openingHours = (() => {
    try {
      return typeof restaurant.opening_hours === "string"
        ? JSON.parse(restaurant.opening_hours)
        : restaurant.opening_hours || {};
    } catch {
      return {};
    }
  })();

  const today = getToday();
  const { open, closesAt } = isOpenNow(openingHours);
  
  // Get today's hours for display
  const todayHours = (() => {
    const dayHours = openingHours[today];
    if (!dayHours || dayHours.isClosed) return "Closed";
    return `${dayHours.openTime || "--:--"} - ${dayHours.closeTime || "--:--"}`;
  })();

  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <HeroSection
        restaurant={restaurant}
        gallery={gallery}
        locale={locale}
        isOpen={open}
        closesAt={closesAt}
      />

      {/* Owner Story Section */}
      <OwnerStorySection
        restaurant={restaurant}
        owners={owners}
        locale={locale}
        isAdmin={isAdmin}
      />

      {/* Gallery Section */}
      <GallerySection
        gallery={gallery}
        restaurantName={restaurant.name}
        primaryColor={restaurant.primaryColor}
        isAdmin={isAdmin}
      />

      {/* Signature Dishes Section */}
      <SignatureDishesSection
        signatureDishes={signature_dishes}
        locale={locale}
        currency={restaurant.currency}
        primaryColor={restaurant.primaryColor}
        isAdmin={isAdmin}
      />

      {/* Reviews & Map Section */}
      <ReviewsMapSection
        restaurant={restaurant}
        locale={locale}
      />

      {/* Contact & Hours Section */}
      <ContactHoursSection
        restaurant={restaurant}
        isOpen={open}
        closesAt={closesAt}
        todayHours={todayHours}
      />

      {/* Admin Panel Hint */}
      {isAdmin && (
        <motion.div
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-2xl shadow-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2, type: "spring" }}
        >
          <p className="text-sm font-medium mb-2">✨ Admin Mode</p>
          <p className="text-xs opacity-90">
            See suggestions to improve your homepage
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
