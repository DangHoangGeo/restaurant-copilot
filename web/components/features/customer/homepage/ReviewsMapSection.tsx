"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Star, 
  MapPin, 
  Navigation, 
  Globe,
  Clock,
  Phone,
  ExternalLink
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createCustomerBrandTheme,
  createCustomerThemeProperties,
} from "@/lib/utils/colors";

interface RestaurantData {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  google_rating?: number;
  google_review_count?: number;
  google_place_id?: string | null;
  primaryColor?: string;
}

interface ReviewsMapSectionProps {
  restaurant: RestaurantData;
  locale: string;
}

export function ReviewsMapSection({ restaurant }: ReviewsMapSectionProps) {
  const t = useTranslations("customer.home.reviews");

  const customerTheme = createCustomerBrandTheme(restaurant.primaryColor);
  const primaryColor = customerTheme.primary;
  
  // Generate Google Maps URLs
  const addressQuery = encodeURIComponent(restaurant.address || restaurant.name);
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`;
  
  // Generate Google Maps embed URL
  //const embedUrl = restaurant.address ? `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${addressQuery}&zoom=15` : `https://www.google.com/maps/embed/v1/search?key=YOUR_GOOGLE_MAPS_API_KEY&q=${addressQuery}&zoom=15`;

  const hasGoogleData = restaurant.google_rating && restaurant.google_review_count;

  return (
    <section 
      className="py-12 px-4 bg-slate-50"
      style={
        createCustomerThemeProperties(primaryColor) as React.CSSProperties
      }
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Reviews Section */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Star className="h-6 w-6 text-amber-500 fill-current" />
                  {t("reviews_and_ratings") || "Reviews & Ratings"}
                </h3>
                <p className="text-slate-600">
                  {t("see_what_customers_say") || "See what our customers are saying"}
                </p>
              </div>

              <div className="p-6">
                {hasGoogleData ? (
                  <>
                    {/* Rating Summary */}
                    <div className="text-center mb-6">
                      <motion.div
                        className="inline-flex items-center gap-3 mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                      >
                        <div className="text-5xl font-bold text-slate-900">
                          {restaurant.google_rating?.toFixed(1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-5 w-5 ${
                                  i < Math.floor(restaurant.google_rating || 0)
                                    ? "text-amber-500 fill-current"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-slate-600">
                            {restaurant.google_review_count} Google reviews
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">
                            Highly rated by customers
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Mock Review Highlights */}
                    <div className="space-y-4">
                      <motion.div
                        className="bg-slate-50 rounded-xl p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                            {"Amazing food and great service!"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          - Recent Google Review
                        </p>
                      </motion.div>

                      <motion.div
                        className="bg-slate-50 rounded-xl p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                           {"Best restaurant in the area!"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          - Recent Google Review
                        </p>
                      </motion.div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">
                      {t("reviews_coming_soon") || "Reviews Coming Soon"}
                    </h4>
                    <p className="text-slate-600">
                      {t("reviews_description") || "Customer reviews will appear here once available"}
                    </p>
                  </div>
                )}

                {/* View on Google Button */}
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <a
                    href={googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[var(--brand-color)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--brand-color)]/90 transition-colors flex items-center justify-center gap-2 group"
                  >
                    <Globe className="h-5 w-5" />
                    {t("view_on_google") || "View on Google"}
                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-[var(--brand-color)]" />
                  {t("location") || "Location"}
                </h3>
                {restaurant.address && (
                  <p className="text-slate-600 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    {restaurant.address}
                  </p>
                )}
              </div>

              {/* Map Embed */}
              <div className="relative">
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                  {/* Placeholder for Google Maps iframe */}
                  <iframe
                    src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.941774037688!2d139.68970031526023!3d35.68948792468433!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cfdabcd1234%3A0xabc1234567890def!2sYour+Restaurant!5e0!3m2!1sen!2sjp!4v1718874848983!5m2!1sen!2sjp`}
                    width="100%"
                    height="100%"
                    className="border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${restaurant.name} location map`}
                  />

                  {/* Floating rating badge */}
                  {hasGoogleData && (
                    <motion.div
                      className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-white/20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="text-amber-500 h-5 w-5 fill-current" />
                        <span className="font-bold text-amber-700">
                          {restaurant.google_rating?.toFixed(1)}
                        </span>
                        <span className="text-slate-500 text-sm">
                          ({restaurant.google_review_count})
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.a
                      href={googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[var(--brand-color)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--brand-color)]/90 transition-colors group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Navigation className="h-5 w-5" />
                      <span className="text-sm">
                        {t("directions") || "Directions"}
                      </span>
                    </motion.a>

                    {restaurant.phone && (
                      <motion.a
                        href={`tel:${restaurant.phone}`}
                        className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-700 transition-colors group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Phone className="h-5 w-5" />
                        <span className="text-sm">
                          {t("call") || "Call"}
                        </span>
                      </motion.a>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t("tap_for_hours") || "Tap for opening hours"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
