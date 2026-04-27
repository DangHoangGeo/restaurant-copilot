'use client';

import { useTranslations } from 'next-intl';

interface WeekdaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
  const t = useTranslations("common");
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
    <div className="flex flex-wrap gap-2">
        {days.map(day => (
          <label 
            key={day.value} 
            className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#e2cfb8] bg-white/70 px-2.5 text-sm transition-colors hover:border-[#b8733d] has-[:checked]:border-[#b8733d] has-[:checked]:bg-[#f4dfc4] dark:border-white/10 dark:bg-black/20 dark:hover:border-[#f5b76d] dark:has-[:checked]:border-[#f5b76d] dark:has-[:checked]:bg-[#f5b76d]/15"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#c9ad8e] text-[#9b6339] focus:ring-[#b8733d] dark:border-white/20 dark:text-[#f5b76d]"
              checked={selectedDays.includes(day.value)}
              onChange={e => {
                const newDays = e.target.checked 
                  ? [...selectedDays, day.value]
                  : selectedDays.filter(d => d !== day.value);
                onChange(newDays);
              }}
            />
            <span className="text-sm text-[#2f2117] dark:text-[#f8eedf]">
              {t(`weekdays.${day.label.toLowerCase()}`)}
            </span>
          </label>
        ))}
    </div>
  );
}
