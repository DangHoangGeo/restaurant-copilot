import { Skeleton, MetricCardSkeleton } from '@/components/ui/skeletons';
import { ChartSkeleton } from '@/components/ui/skeletons/chart-skeleton';

export default function FinanceLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="border rounded-lg">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b last:border-b-0 p-4 grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
