'use client';

import { useTranslations } from 'next-intl';

interface WeekdaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

export function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
  const t = useTranslations('AdminMenu');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {t('item.weekday_visibility')}
      </label>
      <div className="flex flex-wrap gap-2">
        {days.map(day => (
          <label 
            key={day} 
            className="flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg cursor-pointer hover:border-[--brand-color] has-[:checked]:bg-[--brand-color]/10 has-[:checked]:border-[--brand-color]"
          >
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-[--brand-color] rounded border-slate-300 focus:ring-[--brand-color]"
              checked={selectedDays.includes(day)}
              onChange={e => {
                const newDays = e.target.checked 
                  ? [...selectedDays, day]
                  : selectedDays.filter(d => d !== day);
                onChange(newDays);
              }}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t(`weekdays.${day.toLowerCase()}`)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}