"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Phone, 
  Mail, 
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";
import { useTranslations } from "next-intl";
import { RestaurantData } from "@/shared/types";

interface OpeningHours {
  [key: string]: {
    isClosed?: boolean;
    openTime?: string;
    closeTime?: string;
    isOpen?: boolean;
  };
}

interface ContactHoursSectionProps {
  restaurant: RestaurantData;
  isOpen: boolean;
  closesAt?: string;
  todayHours?: string;
}

export function ContactHoursSection({ 
  restaurant, 
  isOpen, 
  closesAt, 
  todayHours 
}: ContactHoursSectionProps) {
  const t = useTranslations("customer.home.contact");
  const [showAllHours, setShowAllHours] = useState(false);

  const primaryColor = restaurant.primaryColor || "#c8773e";

  // Parse opening hours
  const getOpeningHours = (): OpeningHours | null => {
    if (!restaurant.opening_hours) return null;
    
    try {
      const hours = typeof restaurant.opening_hours === 'string' 
        ? JSON.parse(restaurant.opening_hours)
        : restaurant.opening_hours;
      return hours as OpeningHours;
    } catch {
      return null;
    }
  };

  // Parse social links
  const getSocialLinks = (): Record<string, string> => {
    if (!restaurant.social_links) return {};
    
    try {
      const links = typeof restaurant.social_links === 'string' 
        ? JSON.parse(restaurant.social_links)
        : restaurant.social_links;
      return links as Record<string, string>;
    } catch {
      return {};
    }
  };

  const openingHours = getOpeningHours();
  const socialLinks = getSocialLinks();

  const dayNames = [
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
  ];

  const getDayName = (day: string) => {
    const dayMap: Record<string, string> = {
      monday: t("monday") || "Monday",
      tuesday: t("tuesday") || "Tuesday", 
      wednesday: t("wednesday") || "Wednesday",
      thursday: t("thursday") || "Thursday",
      friday: t("friday") || "Friday",
      saturday: t("saturday") || "Saturday",
      sunday: t("sunday") || "Sunday"
    };
    return dayMap[day] || day;
  };

  const getSocialIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('facebook')) return Facebook;
    if (platformLower.includes('instagram')) return Instagram;
    if (platformLower.includes('twitter')) return Twitter;
    return Globe;
  };

  const formatTime = (time: string) => {
    // Convert 24h format to 12h format if needed
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <section 
      className="py-12 px-4 bg-white"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Operating Hours */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-[var(--brand-color)]" />
                  {t("opening_hours") || "Opening Hours"}
                </h3>
                
                {/* Current Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`font-semibold ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
                      {isOpen ? (t("open_now") || "Open Now") : (t("closed") || "Closed")}
                    </span>
                  </div>
                  {isOpen && closesAt && (
                    <span className="text-sm text-slate-600">
                      {t("closes_at") || "Closes at"} {formatTime(closesAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Today's Hours */}
                {todayHours && (
                  <motion.div
                    className="bg-[var(--brand-color)]/5 rounded-xl p-4 mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {t("today") || "Today"}
                      </span>
                      <span className="text-slate-700 font-medium">
                        {todayHours}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Show All Hours Toggle */}
                {openingHours && (
                  <>
                    <button
                      onClick={() => setShowAllHours(!showAllHours)}
                      className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
                    >
                      <span className="font-medium text-slate-700">
                        {showAllHours 
                          ? (t("hide_hours") || "Hide all hours")
                          : (t("show_all_hours") || "Show all hours")
                        }
                      </span>
                      {showAllHours ? (
                        <ChevronUp className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                      )}
                    </button>

                    {/* All Hours */}
                    <AnimatePresence>
                      {showAllHours && (
                        <motion.div
                          className="mt-4 space-y-3"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {dayNames.map((day, index) => {
                            const dayHours = openingHours[day];
                            return (
                              <motion.div
                                key={day}
                                className="flex justify-between items-center py-2 px-4 bg-white rounded-lg border border-slate-100"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <span className="font-medium text-slate-900 capitalize">
                                  {getDayName(day)}
                                </span>
                                <span className={`text-sm ${
                                  dayHours?.isClosed || !dayHours?.isOpen
                                    ? 'text-red-600 font-medium'
                                    : 'text-slate-700'
                                }`}>
                                  {dayHours?.isClosed || !dayHours?.isOpen
                                    ? (t("closed") || "Closed")
                                    : `${formatTime(dayHours.openTime || '')} - ${formatTime(dayHours.closeTime || '')}`
                                  }
                                </span>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {t("contact_information") || "Contact Information"}
                </h3>
                <p className="text-slate-600">
                  {t("get_in_touch") || "Get in touch with us"}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Address */}
                {restaurant.address && (
                  <motion.div
                    className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-[var(--brand-color)]/20 transition-colors group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="bg-[var(--brand-color)]/10 p-2 rounded-lg group-hover:bg-[var(--brand-color)]/20 transition-colors">
                      <MapPin className="h-5 w-5 text-[var(--brand-color)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {t("address") || "Address"}
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        {restaurant.address}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Phone */}
                {restaurant.phone && (
                  <motion.a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-[var(--brand-color)]/20 transition-colors group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="bg-[var(--brand-color)]/10 p-2 rounded-lg group-hover:bg-[var(--brand-color)]/20 transition-colors">
                      <Phone className="h-5 w-5 text-[var(--brand-color)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {t("phone") || "Phone"}
                      </p>
                      <p className="text-slate-700 font-medium">
                        {restaurant.phone}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.a>
                )}

                {/* Email */}
                {restaurant.email && (
                  <motion.a
                    href={`mailto:${restaurant.email}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-[var(--brand-color)]/20 transition-colors group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="bg-[var(--brand-color)]/10 p-2 rounded-lg group-hover:bg-[var(--brand-color)]/20 transition-colors">
                      <Mail className="h-5 w-5 text-[var(--brand-color)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {t("email") || "Email"}
                      </p>
                      <p className="text-slate-700 font-medium">
                        {restaurant.email}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.a>
                )}

                {/* Website */}
                {restaurant.website && (
                  <motion.a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-[var(--brand-color)]/20 transition-colors group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="bg-[var(--brand-color)]/10 p-2 rounded-lg group-hover:bg-[var(--brand-color)]/20 transition-colors">
                      <Globe className="h-5 w-5 text-[var(--brand-color)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {t("website") || "Website"}
                      </p>
                      <p className="text-slate-700 font-medium">
                        {t("visit_website") || "Visit our website"}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.a>
                )}

                {/* Social Media */}
                {Object.keys(socialLinks).length > 0 && (
                  <motion.div
                    className="pt-4 border-t border-slate-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <p className="text-sm font-medium text-slate-900 mb-3">
                      {t("follow_us") || "Follow Us"}
                    </p>
                    <div className="flex gap-3">
                      {Object.entries(socialLinks).map(([platform, url], index) => {
                        const IconComponent = getSocialIcon(platform);
                        return (
                          <motion.a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[var(--brand-color)]/10 hover:bg-[var(--brand-color)]/20 p-3 rounded-lg transition-colors group"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <IconComponent className="h-5 w-5 text-[var(--brand-color)] group-hover:text-[var(--brand-color)]/80 transition-colors" />
                          </motion.a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
