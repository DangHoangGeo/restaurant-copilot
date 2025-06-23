'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());
interface RecordItem { id: string; work_date: string; hours_worked: number | null }

export default function AttendanceTable({ employeeId, month }: { employeeId: string; month: string }) {
  const { data } = useSWR(`/api/v1/owner/employees/${employeeId}/attendance?month=${month}`, fetcher);
  if (!data) return <div>Loading...</div>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {data.records.map((r: RecordItem) => (
          <tr key={r.id}><td>{r.work_date}</td><td>{r.hours_worked ?? '-'}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
