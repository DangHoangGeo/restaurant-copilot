'use client';

import { UseFormReturn } from 'react-hook-form';
import { StreamlinedMenuItemFormData } from '../ItemModal';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import { WeekdaySelector } from '../WeekdaySelector';

interface AdvancedSettingsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
}

const sectionClass = "rounded-xl border border-[#ead9c6] bg-[#fff8ee] shadow-sm dark:border-white/10 dark:bg-white/[0.05]";

export function AdvancedSettingsTab({
  form
}: AdvancedSettingsTabProps) {
  const t = useTranslations('owner.menu.itemModal.advanced');

  return (
    <div className="space-y-4 pb-4 text-[#2f2117] dark:text-[#f8eedf]">
      <div>
        <h3 className="text-lg font-semibold">{t('title')}</h3>
      </div>

      <section className={sectionClass}>
        <div className="p-4">
          <FormField
            control={form.control}
            name="available"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('status')}</FormLabel>
                <label className="flex h-10 items-center justify-between rounded-lg border border-[#e2cfb8] bg-white/80 px-3 text-sm font-medium dark:border-white/10 dark:bg-black/20">
                  <span>{t('availability_label')}</span>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <div className="p-4">
          <FormField
            control={form.control}
            name="weekday_visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('schedule_title')}</FormLabel>
                <FormControl>
                  <WeekdaySelector
                    selectedDays={field.value || []}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>
    </div>
  );
}
