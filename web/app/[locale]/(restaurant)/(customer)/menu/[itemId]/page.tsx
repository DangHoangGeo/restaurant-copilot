import { LoadingStates } from '@/components/features/customer/common/LoadingStates';

interface MenuItemPageProps {
  params: Promise<{ locale: string; itemId: string }>;
}

export default async function MenuItemPage({ params }: MenuItemPageProps) {
  const { locale, itemId } = await params;
  console.log(`Locale: ${locale}, Item ID: ${itemId}`);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <a href="../menu" className="text-primary hover:underline">&larr; Back to menu</a>
      </div>
      
      <LoadingStates type="detail" count={1} />
      
      <div className="mt-8 text-center text-slate-500">
        Coming in Phase 2: Item Details Page
      </div>
    </div>
  );
}
