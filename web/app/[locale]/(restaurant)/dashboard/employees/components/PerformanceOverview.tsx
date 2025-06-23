'use client';

export default function PerformanceOverview() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 border rounded">Hours This Week</div>
      <div className="p-4 border rounded">Hours This Month</div>
      <div className="p-4 border rounded">Avg Lateness</div>
    </div>
  );
}
