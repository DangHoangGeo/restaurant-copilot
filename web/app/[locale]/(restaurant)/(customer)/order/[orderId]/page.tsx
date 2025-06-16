import { LoadingStates } from '@/components/features/customer/common/LoadingStates';

interface OrderPageProps {
  params: Promise<{ locale: string; orderId: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { locale, orderId } = await params;
  console.log(`Locale: ${locale}, Order ID: ${orderId}`);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order #{orderId}</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Order Status</h2>
          <span className="bg-amber-100 text-amber-800 text-sm py-1 px-3 rounded-full">
            Pending
          </span>
        </div>
        
        <LoadingStates type="list" count={4} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Order Details</h3>
          <LoadingStates type="list" count={2} />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Session Information</h3>
          <LoadingStates type="list" count={2} />
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <button className="bg-primary text-white py-2 px-6 rounded-md opacity-50 cursor-not-allowed">
          Add More Items
        </button>
      </div>
      
      <div className="mt-8 text-center text-slate-500">
        Coming in Phase 3: Order Confirmation & Status
      </div>
    </div>
  );
}
