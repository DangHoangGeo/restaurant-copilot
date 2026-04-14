import { DashboardSkeleton } from '@/components/ui/skeletons';

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6">
      <DashboardSkeleton />
    </div>
  );
}
