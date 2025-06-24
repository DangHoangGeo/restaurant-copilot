import React from 'react';
import { Skeleton, MetricCardSkeleton } from './skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 md:h-8 w-1/3" />
        <Skeleton className="h-3 md:h-4 w-1/2" />
      </div>

      {/* Metrics Cards - Mobile/Tablet */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Metrics Cards - Desktop */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Recent Orders Section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="border rounded-lg">
          {/* Table header */}
          <div className="border-b p-4">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b last:border-b-0 p-4">
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
