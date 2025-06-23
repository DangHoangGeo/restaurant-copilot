'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function EmployeeForm({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations('owner.employees');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const role = 'employee';

  async function submit() {
    await fetch('/api/v1/owner/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    onSaved();
  }

  return (
    <div className="space-y-2">
      <Input placeholder={t('form.name_placeholder')} value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder={t('form.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button onClick={submit}>{t('actions.save')}</Button>
    </div>
  );
}
