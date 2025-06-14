"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';

interface AnimatedRestaurantHeaderProps {
  /** Restaurant settings containing name and logo */
  restaurantSettings: {
    name: string;
    logoUrl?: string | null;
  };
  /** Optional rating to display (defaults to 4.8) */
  rating?: number;
  /** Text for the interactive element badge (e.g., "Table Booking", "Trending", "Menu") */
  badgeText?: string;
  /** Icon for the interactive element badge */
  badgeIcon?: React.ComponentType<{ className?: string }>;
  /** Custom class names for additional styling */
  className?: string;
}

export function AnimatedRestaurantHeader({
  restaurantSettings,
  rating = 4.8,
  badgeText = "Table Booking",
  badgeIcon: BadgeIcon = TrendingUp,
  className = "",
}: AnimatedRestaurantHeaderProps) {
  return (
    <motion.header 
      className={`bg-white dark:bg-slate-800 shadow-sm border-b backdrop-blur-md bg-opacity-95 ${className}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {restaurantSettings.logoUrl && (
              <motion.div 
                className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image
                  src={restaurantSettings.logoUrl}
                  alt={restaurantSettings.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </motion.div>
            )}
            <div>
              <motion.h1 
                className="text-3xl font-bold text-slate-800 dark:text-slate-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {restaurantSettings.name}
              </motion.h1>
            </div>
          </motion.div>

          {/* Optional Interactive Elements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center space-x-2"
          >
            {/* Rating Display */}
            <motion.div 
              className="hidden md:flex items-center space-x-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Star className="h-4 w-4 text-amber-500 fill-current" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{rating}</span>
            </motion.div>
            
            {/* Interactive Badge */}
            <motion.div 
              className="hidden lg:flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <BadgeIcon className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{badgeText}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
