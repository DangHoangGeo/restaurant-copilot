import { LoadingStates } from '@/components/features/customer/common/LoadingStates';

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LoadingStates type="table" count={3} />
        </div>
        
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <LoadingStates type="list" count={3} />
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>$0.00</span>
              </div>
              <button className="w-full bg-primary text-white py-2 px-4 rounded-md mt-4 opacity-50 cursor-not-allowed">
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-500">
        Coming in Phase 3: Cart & Checkout
      </div>
    </div>
  );
}
