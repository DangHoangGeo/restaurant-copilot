'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ScheduleWeek({ employeeId }: { employeeId: string }) {
  const [weekData, setWeekData] = useState<Record<string, {start: string, end: string}>>({});
  async function save() {
    const payload = Object.entries(weekData).map(([day, v]) => ({
      work_date: day,
      start_time: v.start,
      end_time: v.end,
    }));
    await fetch(`/api/v1/owner/employees/${employeeId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return (
    <div>
      {Object.keys(weekData).map((day) => (
        <div key={day} className="flex gap-2">
          <Input type="time" value={weekData[day].start} onChange={e => setWeekData({ ...weekData, [day]: { ...weekData[day], start: e.target.value } })} />
          <Input type="time" value={weekData[day].end} onChange={e => setWeekData({ ...weekData, [day]: { ...weekData[day], end: e.target.value } })} />
        </div>
      ))}
      <Button onClick={save}>Save</Button>
    </div>
  );
}
