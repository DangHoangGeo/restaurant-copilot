"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Star, 
  MapPin, 
  Menu as MenuIcon, 
  CalendarDays, 
  Phone,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface RestaurantData {
  id: string;
  name: string;
  logoUrl?: string | null;
  tagline_en?: string | null;
  tagline_ja?: string | null;
  tagline_vi?: string | null;
  description_en?: string | null;
  description_ja?: string | null;
  description_vi?: string | null;
  address?: string | null;
  phone?: string | null;
  primaryColor?: string;
  google_rating?: number;
  google_review_count?: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string | null;
  alt_text: string;
  is_hero: boolean;
}

interface HeroSectionProps {
  restaurant: RestaurantData;
  gallery: GalleryImage[];
  locale: string;
  isOpen: boolean;
  closesAt?: string;
}

export function HeroSection({ 
  restaurant, 
  gallery, 
  locale, 
  isOpen, 
  closesAt 
}: HeroSectionProps) {
  const t = useTranslations("customer.home.hero");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get hero images (prioritize images marked as hero, fallback to first few gallery images)
  const heroImages = gallery.filter(img => img.is_hero).length > 0 
    ? gallery.filter(img => img.is_hero)
    : gallery.slice(0, 3);

  const getTagline = () => {
    switch (locale) {
      case 'ja': return restaurant.tagline_ja;
      case 'vi': return restaurant.tagline_vi;
      default: return restaurant.tagline_en;
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === heroImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? heroImages.length - 1 : prev - 1
    );
  };

  const primaryColor = restaurant.primaryColor || "#3B82F6";

  return (
    <section 
      className="relative bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      {/* Hero Image Carousel */}
      {heroImages.length > 0 && (
        <div className="relative h-64 sm:h-80 md:h-96">
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <motion.div
                key={image.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: index === currentImageIndex ? 1 : 0,
                  scale: index === currentImageIndex ? 1 : 1.05
                }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Image
                  src={image.image_url}
                  alt={image.alt_text}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </motion.div>
            ))}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Navigation Arrows */}
          {heroImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Indicators */}
          {heroImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex 
                      ? 'bg-white' 
                      : 'bg-white/50'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restaurant Info Overlay */}
      <div className="relative z-10 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Restaurant Title Section */}
          <div className="flex items-start gap-4 mb-6">
            {restaurant.logoUrl && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative"
              >
                <Image
                  src={restaurant.logoUrl}
                  alt={`${restaurant.name} logo`}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl border-2 border-white shadow-lg object-cover"
                />
                <div className="absolute -bottom-1 -right-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                      isOpen 
                        ? "bg-emerald-500 text-white" 
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {isOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </motion.div>
            )}

            <div className="flex-1 min-w-0">
              <motion.h1 
                className="font-bold text-3xl sm:text-4xl text-slate-900 mb-2 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {restaurant.name}
              </motion.h1>

              {getTagline() && (
                <motion.p 
                  className="text-lg text-slate-600 mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {getTagline()}
                </motion.p>
              )}

              {restaurant.address && (
                <motion.div 
                  className="flex items-center gap-2 text-slate-600 mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <MapPin className="h-4 w-4 text-[var(--brand-color)] flex-shrink-0" />
                  <span className="text-sm truncate">{restaurant.address}</span>
                </motion.div>
              )}

              {/* Rating Display */}
              {restaurant.google_rating && (
                <motion.div 
                  className="flex items-center gap-3 mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <Star className="text-amber-500 h-4 w-4 fill-current" />
                    <span className="font-bold text-amber-700">
                      {restaurant.google_rating.toFixed(1)}
                    </span>
                  </div>
                  {restaurant.google_review_count && (
                    <span className="text-sm text-slate-500">
                      ({restaurant.google_review_count} reviews)
                    </span>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex gap-3">
				<Link href={`/${locale}/menu`} passHref>
					<Button
						className="flex-1 py-4 px-6 font-bold text-white bg-[var(--brand-color)] hover:bg-[var(--brand-color)]/90 shadow-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
						size="lg"
					>
						<MenuIcon className="h-5 w-5 mr-2" />
						{t("view_menu") || "View Menu"}
					</Button>
				</Link>
				<Link href={`/${locale}/booking`} passHref>
              <Button
                
                variant="outline"
                className="flex-1 py-4 px-6 font-bold bg-white text-[var(--brand-color)] border-2 border-[var(--brand-color)] shadow-lg rounded-xl hover:bg-[var(--brand-color)]/5 transition-all duration-200 transform hover:scale-[1.02]"
                size="lg"
              >
                <CalendarDays className="h-5 w-5 mr-2" />
                {t("make_reservation") || "Reserve"}
              </Button>
			  </Link>
			
            </div>

            {/* Quick Call Action */}
            {restaurant.phone && (
              <motion.a
                href={`tel:${restaurant.phone}`}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors shadow-lg"
                aria-label={`Call ${restaurant.name}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Phone className="h-5 w-5" />
                Call Now • {restaurant.phone}
              </motion.a>
            )}
          </motion.div>

          {/* Status Message */}
          {isOpen && closesAt && (
            <motion.div 
              className="mt-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                ✓ Open until {closesAt}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
