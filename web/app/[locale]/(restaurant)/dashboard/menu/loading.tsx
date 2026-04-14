import { MenuSkeleton } from '@/components/ui/skeletons';

export default function MenuLoading() {
  return (
    <div className="p-4 md:p-6">
      <MenuSkeleton />
    </div>
  );
}
