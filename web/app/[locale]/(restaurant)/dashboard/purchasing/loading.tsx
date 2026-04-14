import { Skeleton, MetricCardSkeleton } from '@/components/ui/skeletons';

export default function PurchasingLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>

      <div className="border rounded-lg">
        <div className="border-b p-4 flex gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b last:border-b-0 p-4 grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
