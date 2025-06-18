"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeletons/skeleton";

export interface LoadingProps {
  type: "card" | "list" | "detail" | "grid" | "table";
  count?: number;
}

export function LoadingStates({ type, count = 3 }: LoadingProps) {
  switch (type) {
    case "card":
      return (
        <div className="space-y-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-3/4 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className="space-y-2">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      );

    case "detail":
      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="h-64 w-full md:w-96 rounded-lg" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-32 mt-4" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          </div>
        </div>
      );

    case "grid":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 flex justify-between border-b">
            <Skeleton className="h-5 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <div className="p-4">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="flex justify-between py-3 border-b last:border-b-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
