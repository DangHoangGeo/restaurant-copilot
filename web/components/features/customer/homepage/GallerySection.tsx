"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Camera,
  Plus
} from "lucide-react";
import { useTranslations } from "next-intl";

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string | null;
  alt_text: string;
  sort_order: number;
  is_hero?: boolean;
}

interface GallerySectionProps {
  gallery: GalleryImage[];
  restaurantName: string;
  primaryColor?: string;
  isAdmin?: boolean;
}

export function GallerySection({ 
  gallery, 
  restaurantName, 
  primaryColor = "#3B82F6",
  isAdmin = false 
}: GallerySectionProps) {
  const t = useTranslations("customer.home.gallery");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Filter out hero images for gallery display
  const galleryImages = gallery.filter(img => !img.is_hero) || [];

  if (galleryImages.length === 0) {
    // Show admin encouragement if user is admin
    if (isAdmin) {
      return (
        <section className="py-12 px-4 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4">
                <Camera className="h-12 w-12 text-slate-400 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Showcase Your Restaurant
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Add photos of your dishes, ambiance, and team to give customers a taste of what to expect!
              </p>
              <button 
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="h-5 w-5" />
                Add Photos
              </button>
            </motion.div>
          </div>
        </section>
      );
    }
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const nextLightboxImage = () => {
    setSelectedImageIndex(prev => 
      prev === null ? 0 : (prev + 1) % galleryImages.length
    );
  };

  const prevLightboxImage = () => {
    setSelectedImageIndex(prev => 
      prev === null ? 0 : prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  const nextCarousel = () => {
    setCurrentCarouselIndex(prev => 
      prev >= galleryImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevCarousel = () => {
    setCurrentCarouselIndex(prev => 
      prev <= 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  // Calculate visible images for desktop grid
  const visibleImages = galleryImages.slice(0, 8); // Show max 8 images in grid

  return (
    <>
      <section 
        className="py-12 px-4 bg-slate-50"
        style={{ '--brand-color': primaryColor } as React.CSSProperties}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {t("gallery") || "Gallery"}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t("gallery_description") || `Take a look inside ${restaurantName}`}
            </p>
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/60 rounded-full mx-auto mt-4"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />
          </motion.div>

          {/* Mobile Carousel */}
          <div className="block md:hidden mb-6">
            <div className="relative">
              <motion.div
                className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Image
                  src={galleryImages[currentCarouselIndex].image_url}
                  alt={galleryImages[currentCarouselIndex].alt_text}
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => openLightbox(currentCarouselIndex)}
                />
                
                {galleryImages[currentCarouselIndex].caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-sm">
                      {galleryImages[currentCarouselIndex].caption}
                    </p>
                  </div>
                )}
              </motion.div>

              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevCarousel}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextCarousel}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
                {currentCarouselIndex + 1} / {galleryImages.length}
              </div>
            </div>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleImages.map((image, index) => (
              <motion.div
                key={image.id}
                className={`relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer group ${
                  index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => openLightbox(index)}
                whileHover={{ scale: 1.02 }}
              >
                <Image
                  src={image.image_url}
                  alt={image.alt_text}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Caption Overlay */}
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm truncate">
                      {image.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Show More Button */}
            {galleryImages.length > 8 && (
              <motion.div
                className="aspect-square rounded-xl bg-gradient-to-br from-[var(--brand-color)]/10 to-[var(--brand-color)]/5 border-2 border-dashed border-[var(--brand-color)]/30 flex flex-col items-center justify-center cursor-pointer hover:from-[var(--brand-color)]/20 hover:to-[var(--brand-color)]/10 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => openLightbox(8)}
              >
                <Plus className="h-8 w-8 text-[var(--brand-color)] mb-2" />
                <span className="text-[var(--brand-color)] font-medium">
                  +{galleryImages.length - 8} more
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-auto">
                <Image
                  src={galleryImages[selectedImageIndex].image_url}
                  alt={galleryImages[selectedImageIndex].alt_text}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              </div>

              {/* Caption */}
              {galleryImages[selectedImageIndex].caption && (
                <div className="mt-4 text-center">
                  <p className="text-white text-lg">
                    {galleryImages[selectedImageIndex].caption}
                  </p>
                </div>
              )}

              {/* Navigation */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevLightboxImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-3 text-white hover:bg-white/30 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextLightboxImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-3 text-white hover:bg-white/30 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
                aria-label="Close gallery"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white">
                {selectedImageIndex + 1} / {galleryImages.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
