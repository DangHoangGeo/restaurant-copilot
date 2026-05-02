'use client';

import { UseFormReturn } from 'react-hook-form';
import { StreamlinedMenuItemFormData } from '../ItemModal';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { WeekdaySelector } from '../WeekdaySelector';

interface AdvancedSettingsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
}

const sectionClass = "rounded-xl border border-[#ead9c6] bg-[#fff8ee] shadow-sm dark:border-white/10 dark:bg-white/[0.05]";
const recommendationTags = [
  "breakfast",
  "lunch",
  "afternoon",
  "dinner",
  "late",
  "set_menu",
  "main_dish",
  "best_seller",
  "quick",
  "sharing",
  "drink",
  "dessert",
];

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
        <div className="space-y-4 p-4">
          <FormField
            control={form.control}
            name="prep_station"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('station_title')}</FormLabel>
                <Select
                  value={field.value || "food"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 rounded-lg border-[#e2cfb8] bg-white/80 dark:border-white/10 dark:bg-black/20">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="food">{t('station_food')}</SelectItem>
                    <SelectItem value="drink">{t('station_drink')}</SelectItem>
                    <SelectItem value="other">{t('station_other')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => {
              const selectedTags = field.value || [];
              return (
                <FormItem>
                  <FormLabel>{t('tags_title')}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {recommendationTags.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              selected
                                ? selectedTags.filter((current) => current !== tag)
                                : [...selectedTags, tag],
                            )
                          }
                          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ab6e3c]"
                        >
                          <Badge
                            className={
                              selected
                                ? "rounded-md bg-[#ab6e3c] text-white hover:bg-[#ab6e3c]"
                                : "rounded-md border border-[#d9c4ad] bg-white/75 text-[#6f4d35] hover:bg-[#f5ead8] dark:border-white/10 dark:bg-black/20 dark:text-[#f8eedf]"
                            }
                          >
                            {tag.replace(/_/g, " ")}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
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
