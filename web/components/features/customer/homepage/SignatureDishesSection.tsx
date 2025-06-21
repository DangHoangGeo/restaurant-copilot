"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Star, 
  ArrowRight, 
  ChefHat,
  Sparkles,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

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

interface SignatureDishesSectionProps {
  signatureDishes: SignatureDish[];
  locale: string;
  currency?: string;
  primaryColor?: string;
  isAdmin?: boolean;
}

export function SignatureDishesSection({ 
  signatureDishes, 
  locale, 
  currency = "JPY",
  primaryColor = "#3B82F6",
  isAdmin = false 
}: SignatureDishesSectionProps) {
  const t = useTranslations("customer.home");

  const getDishName = (dish: SignatureDish) => {
    switch (locale) {
      case 'ja': return dish.name_ja;
      case 'vi': return dish.name_vi;
      default: return dish.name_en;
    }
  };

  const getDishDescription = (dish: SignatureDish) => {
    switch (locale) {
      case 'ja': return dish.description_ja;
      case 'vi': return dish.description_vi;
      default: return dish.description_en;
    }
  };

  const getCategoryName = (dish: SignatureDish) => {
    switch (locale) {
      case 'ja': return dish.category_name_ja;
      case 'vi': return dish.category_name_vi;
      default: return dish.category_name_en;
    }
  };

  const formatPrice = (price: number) => {
    if (currency === "JPY") {
      return `¥${Math.round(price).toLocaleString()}`;
    } else if (currency === "USD") {
      return `$${price.toFixed(2)}`;
    } else if (currency === "VND") {
      return `${Math.round(price).toLocaleString()}₫`;
    }
    return `${price.toFixed(2)} ${currency}`;
  };

  if (!signatureDishes || signatureDishes.length === 0) {
    // Show admin encouragement if user is admin
    if (isAdmin) {
      return (
        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4">
                <ChefHat className="h-12 w-12 text-orange-500 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-orange-900 mb-2">
                Highlight Your Best Dishes
              </h3>
              <p className="text-orange-700 mb-6 max-w-md mx-auto">
                Select 2-4 signature dishes to showcase on your homepage and attract more customers!
              </p>
              <button 
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Select Signature Dishes
              </button>
            </motion.div>
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section 
      className="py-12 px-4 bg-white"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-[var(--brand-color)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {t("signature_dishes") || "Signature Dishes"}
            </h2>
            <Sparkles className="h-6 w-6 text-[var(--brand-color)]" />
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("signature_dishes_description") || "Discover our most popular and chef-recommended dishes"}
          </p>
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/60 rounded-full mx-auto mt-4"
            initial={{ width: 0 }}
            animate={{ width: 96 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          />
        </motion.div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {signatureDishes.slice(0, 4).map((dish, index) => (
            <motion.div
              key={dish.id}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Dish Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {dish.image_url ? (
                  <Image
                    src={dish.image_url}
                    alt={getDishName(dish)}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-slate-400" />
                  </div>
                )}

                {/* Popular Badge */}
                <div className="absolute top-3 left-3">
                  <motion.div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    {t("signature") || "Signature"}
                  </motion.div>
                </div>

                {/* Price Badge */}
                <div className="absolute top-3 right-3">
                  <div className="bg-white/90 backdrop-blur-sm text-slate-900 font-bold px-3 py-1 rounded-full shadow-lg">
                    {formatPrice(dish.price)}
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <motion.button
                      className="w-full bg-[var(--brand-color)] text-white py-2 px-4 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t("add_to_cart") || "Add to Cart"}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Dish Info */}
              <div className="p-6">
                {/* Category */}
                {getCategoryName(dish) && (
                  <p className="text-[var(--brand-color)] text-sm font-medium uppercase tracking-wide mb-2">
                    {getCategoryName(dish)}
                  </p>
                )}

                {/* Dish Name */}
                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-[var(--brand-color)] transition-colors">
                  {getDishName(dish)}
                </h3>

                {/* Description */}
                {getDishDescription(dish) && (
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4">
                    {getDishDescription(dish)}
                  </p>
                )}

                {/* Price and CTA */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-[var(--brand-color)]">
                    {formatPrice(dish.price)}
                  </div>
                  <motion.button
                    className="text-[var(--brand-color)] hover:text-[var(--brand-color)]/80 font-medium text-sm flex items-center gap-1"
                    whileHover={{ x: 4 }}
                  >
                    {t("view_details") || "Details"}
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Browse Full Menu CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
			<Link href={`/${locale}/menu`} passHref>
            <Button
              size="lg"
              className="bg-[var(--brand-color)] hover:bg-[var(--brand-color)]/90 text-white shadow-lg group relative overflow-hidden"
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative flex items-center gap-2">
                {t("browse_full_menu") || "Browse Full Menu"}
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
			</Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
