'use client';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

const fetcher = (url: string) => fetch(url).then(r => r.json());
interface Employee { id: string; name: string }

export default function EmployeeList() {
  const { data, mutate } = useSWR('/api/v1/owner/employees', fetcher);
  const t = useTranslations('owner.employees');
  if (!data) return <div>Loading...</div>;
  return (
    <div>
      {data.employees.map((e: Employee) => (
        <div key={e.id} className="flex justify-between py-2">
          <span>{e.name}</span>
        </div>
      ))}
      <Button onClick={() => mutate()}>{t('retry')}</Button>
    </div>
  );
}
