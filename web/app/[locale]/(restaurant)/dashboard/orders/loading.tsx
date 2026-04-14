import { OrdersSkeleton } from '@/components/ui/skeletons';

export default function OrdersLoading() {
  return (
    <div className="p-4 md:p-6">
      <OrdersSkeleton />
    </div>
  );
}
