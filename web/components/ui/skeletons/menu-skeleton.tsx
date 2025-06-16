import React from 'react';
import { Skeleton } from './skeleton';

export function MenuSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Categories and items */}
      <div className="space-y-8">
        {[...Array(3)].map((_, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            {/* Category header */}
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            
            {/* Menu items */}
            <div className="grid gap-4">
              {[...Array(4)].map((_, itemIndex) => (
                <div key={itemIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
