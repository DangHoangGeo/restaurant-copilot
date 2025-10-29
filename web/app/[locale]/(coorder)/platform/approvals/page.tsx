// Platform Admin Pending Approvals Page

import ApprovalsTable from '@/components/platform/approvals-table';

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Pending Approvals
        </h1>
        <p className="text-gray-500 mt-1">
          Review and approve new restaurant signups
        </p>
      </div>

      {/* Approvals Table */}
      <ApprovalsTable />
    </div>
  );
}
