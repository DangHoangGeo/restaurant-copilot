"use client";

import React, { useEffect } from "react";
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
  locale?: string;
  isAdmin?: boolean;
  homepageData: HomepageData;
}

// Helper functions
function getToday() {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
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

export function NewHomePage({ locale = "en", isAdmin = false, homepageData }: NewHomePageProps) {
  const t = useTranslations("customer.home");

  // Apply restaurant brand color to CSS custom property
  useEffect(() => {
    if (homepageData?.restaurant?.primaryColor) {
      document.documentElement.style.setProperty("--brand-color", homepageData.restaurant.primaryColor);
    }
  }, [homepageData]);

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
