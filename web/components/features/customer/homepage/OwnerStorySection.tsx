"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { UserCircle, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

interface Owner {
  id: string;
  name?: string | null;
  email: string;
  photo_url?: string | null;
}

interface RestaurantData {
  id: string;
  name: string;
  owner_story_en?: string | null;
  owner_story_ja?: string | null;
  owner_story_vi?: string | null;
  primaryColor?: string;
}

interface OwnerStorySectionProps {
  restaurant: RestaurantData;
  owners: Owner[];
  locale: string;
  isAdmin?: boolean;
}

export function OwnerStorySection({ 
  restaurant, 
  owners, 
  locale, 
  isAdmin = false 
}: OwnerStorySectionProps) {
  const t = useTranslations("customer.home.owner_story");

  const getOwnerStory = () => {
    switch (locale) {
      case 'ja': return restaurant.owner_story_ja;
      case 'vi': return restaurant.owner_story_vi;
      default: return restaurant.owner_story_en;
    }
  };

  const ownerStory = getOwnerStory();
  const hasOwners = owners && owners.length > 0;
  const hasStory = ownerStory && ownerStory.trim().length > 0;

  // Don't render section if no owners and no story
  if (!hasOwners && !hasStory) {
    // Show admin encouragement if user is admin
    if (isAdmin) {
      return (
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="rounded-2xl border border-[#c8773e]/20 bg-gradient-to-r from-[#fff7e9] to-[#f6e8d3] p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4">
                <Heart className="mx-auto h-8 w-8 text-[#c8773e]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#372719]">
                Add Your Story
              </h3>
              <p className="mb-4 text-[#6d5a45]">
                Share your passion and story to help customers connect with your restaurant!
              </p>
              <button className="rounded-lg bg-[#c8773e] px-4 py-2 text-white transition-colors hover:bg-[#a9572d]">
                Add Owner Story
              </button>
            </motion.div>
          </div>
        </section>
      );
    }
    return null;
  }

  const primaryColor = restaurant.primaryColor || "#c8773e";

  return (
    <section 
      className="py-12 px-4 bg-white"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Section Header */}
          <div className="text-center mb-8">
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {t("meet_the_owner") || "Meet the Owner"}
            </motion.h2>
            {hasStory && (
              <motion.div
                className="w-24 h-1 bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/60 rounded-full mx-auto"
                initial={{ width: 0 }}
                animate={{ width: 96 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              />
            )}
          </div>

          {/* Owners Display */}
          {hasOwners && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={`flex flex-wrap justify-center gap-6 ${owners.length === 1 ? 'flex-col items-center' : ''}`}>
                {owners.map((owner, index) => (
                  <motion.div
                    key={owner.id}
                    className="flex flex-col items-center text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="relative mb-4">
                      {owner.photo_url ? (
                        <Image
                          src={owner.photo_url}
                          alt={owner.name || "Owner"}
                          width={120}
                          height={120}
                          className="h-24 w-24 sm:h-30 sm:w-30 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="h-24 w-24 sm:h-30 sm:w-30 rounded-full bg-gradient-to-br from-[var(--brand-color)] to-[var(--brand-color)]/70 flex items-center justify-center border-4 border-white shadow-lg">
                          <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                        </div>
                      )}
                      
                      {/* Decorative ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[var(--brand-color)]/30"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    
                    {owner.name && (
                      <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        {owner.name}
                      </h3>
                    )}
                    
                    <span className="text-sm text-[var(--brand-color)] font-medium uppercase tracking-wide">
                      Owner
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Owner Story */}
          {hasStory && (
            <motion.div
              className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 shadow-sm border border-slate-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed">
                {ownerStory.split('\n').map((paragraph, index) => (
                  <motion.p
                    key={index}
                    className="mb-4 last:mb-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </div>

              {/* Decorative quote mark */}
              <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <span className="text-6xl text-[var(--brand-color)]/20 font-serif leading-none">
                  “
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Admin Encouragement for Missing Content */}
          {isAdmin && (!hasStory || !hasOwners) && (
            <motion.div
              className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-amber-800 text-sm">
                {!hasOwners && "Add owner information and photos. "}
                {!hasStory && "Share your story to help customers connect with your restaurant!"}
              </p>
              <button className="mt-2 text-amber-700 hover:text-amber-900 font-medium text-sm underline">
                Complete Your Profile
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
