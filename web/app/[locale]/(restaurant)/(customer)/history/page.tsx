import { LoadingStates } from '@/components/features/customer/common/LoadingStates';

export default function HistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order History</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Session</h2>
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300">Session Code:</p>
            <p className="font-mono font-bold">ABC123</p>
          </div>
          <div>
            <button className="text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 py-1 px-3 rounded-md opacity-50 cursor-not-allowed">
              Share
            </button>
          </div>
        </div>
        
        <LoadingStates type="table" count={2} />
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Past Orders</h2>
        <LoadingStates type="table" count={3} />
      </div>
      
      <div className="mt-8 text-center">
        <div className="flex justify-center gap-4">
          <button className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-6 rounded-md opacity-50 cursor-not-allowed">
            Join Another Session
          </button>
          <button className="bg-primary text-white py-2 px-6 rounded-md opacity-50 cursor-not-allowed">
            Start New Session
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-500">
        Coming in Phase 4: Order History & Session Management
      </div>
    </div>
  );
}
