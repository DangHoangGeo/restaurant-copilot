import React from 'react';
import { Skeleton } from './skeleton';

export function EmployeesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Action bar with view toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded-xl flex">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Employee Cards/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Schedule View Alternative */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-1/4" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="p-3"><Skeleton className="h-4 w-16" /></th>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="p-3"><Skeleton className="h-4 w-12" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-3"><Skeleton className="h-4 w-16" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
