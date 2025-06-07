'use client';

import { useTranslations } from 'next-intl';

interface WeekdaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
  const t = useTranslations('AdminMenu');
  const days = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 7, label: 'Sun' }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {t('item.weekday_visibility')}
      </label>
      <div className="flex flex-wrap gap-2">
        {days.map(day => (
          <label 
            key={day.value} 
            className="flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg cursor-pointer hover:border-[--brand-color] has-[:checked]:bg-[--brand-color]/10 has-[:checked]:border-[--brand-color]"
          >
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-[--brand-color] rounded border-slate-300 focus:ring-[--brand-color]"
              checked={selectedDays.includes(day.value)}
              onChange={e => {
                const newDays = e.target.checked 
                  ? [...selectedDays, day.value]
                  : selectedDays.filter(d => d !== day.value);
                onChange(newDays);
              }}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t(`weekdays.${day.label.toLowerCase()}`)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}