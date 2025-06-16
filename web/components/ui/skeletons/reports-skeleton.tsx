import React from 'react';
import { Skeleton } from './skeleton';

export function ReportsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
      
      {/* Recent Activity Section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="border rounded-lg p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
