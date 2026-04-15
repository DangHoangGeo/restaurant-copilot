'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

interface MenuCardSkeletonProps {
  count?: number;
  variant?: 'grid' | 'list';
  className?: string;
}

interface CategorySkeletonProps {
  count?: number;
  className?: string;
}

export function Skeleton({ 
  className, 
  variant = 'default',
  width,
  height,
  rounded = 'md',
  ...props 
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  const baseClasses = cn(
    'bg-slate-200 dark:bg-slate-700',
    roundedClasses[rounded],
    className
  );

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  // Extract DOM props and exclude conflicting ones
  const { 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDrag, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDragStart, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDragEnd, 
    ...domProps 
  } = props;

  if (variant === 'shimmer') {
    return (
      <div
        className={cn(baseClasses, 'relative overflow-hidden')}
        style={style}
        {...domProps}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={baseClasses}
        style={style}
        animate={{
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    );
  }

  if (variant === 'wave') {
    return (
      <motion.div
        className={baseClasses}
        style={style}
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    );
  }

  return (
    <div
      className={cn(baseClasses, 'animate-pulse')}
      style={style}
      {...domProps}
    />
  );
}

export function MenuCardSkeleton({ count = 6, variant = 'grid', className }: MenuCardSkeletonProps) {
  const gridClasses = variant === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    : 'space-y-4';

  return (
    <div className={cn(gridClasses, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {/* Image skeleton */}
          <Skeleton 
            variant="shimmer" 
            className="w-full h-48" 
            rounded="none"
          />
          
          <div className="p-4 space-y-3">
            {/* Title skeleton */}
            <Skeleton 
              variant="shimmer" 
              className="h-6 w-3/4" 
            />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton 
                variant="shimmer" 
                className="h-4 w-full" 
              />
              <Skeleton 
                variant="shimmer" 
                className="h-4 w-2/3" 
              />
            </div>
            
            {/* Price and actions skeleton */}
            <div className="flex items-center justify-between pt-2">
              <Skeleton 
                variant="shimmer" 
                className="h-6 w-16" 
              />
              <Skeleton 
                variant="shimmer" 
                className="h-9 w-24" 
                rounded="md"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function CategoryTabSkeleton({ count = 4, className }: CategorySkeletonProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton 
            variant="shimmer" 
            className="h-10 w-24 flex-shrink-0" 
            rounded="md"
          />
        </motion.div>
      ))}
    </div>
  );
}

export function SearchBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative max-w-md mx-auto', className)}>
      <Skeleton 
        variant="shimmer" 
        className="h-12 w-full" 
        rounded="full"
      />
    </div>
  );
}

// Smart menu specific skeleton
export function SmartMenuSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-400">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-3">
            <Skeleton 
              variant="shimmer" 
              className="h-8 w-64 mx-auto bg-white/20" 
            />
            <Skeleton 
              variant="shimmer" 
              className="h-5 w-80 mx-auto bg-white/10" 
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search skeleton */}
        <div className="mb-6">
          <SearchBarSkeleton />
        </div>

        {/* Category tabs skeleton */}
        <div className="mb-8">
          <CategoryTabSkeleton />
        </div>

        {/* Menu items skeleton */}
        <MenuCardSkeleton count={9} />
      </div>
    </div>
  );
}
