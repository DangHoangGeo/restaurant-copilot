'use client';

import { UseFormReturn } from 'react-hook-form';
import { StreamlinedMenuItemFormData } from '../ItemModal';
import { MenuItemCategory } from '@/shared/types/menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Settings, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { WeekdaySelector } from '../WeekdaySelector';

interface AdvancedSettingsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  categories: MenuItemCategory[];
  isEditing: boolean;
}

export function AdvancedSettingsTab({
  form,
  categories,
  isEditing
}: AdvancedSettingsTabProps) {
  const t = useTranslations('owner.menu.itemModal.advanced');

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Category Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('category_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('category_label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_category_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      {t('category_edit_note')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Availability Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('availability_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium">{t('availability_label')}</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {t('availability_description')}
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('schedule_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="weekday_visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('schedule_label')}</FormLabel>
                  <div className="space-y-2">
                    <WeekdaySelector 
                      selectedDays={field.value || []} 
                      onChange={field.onChange} 
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('schedule_description')}
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">{t('summary_title')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('category')}:</span>
                <span className="font-medium">
                  {categories.find(c => c.id === form.watch('category_id'))?.name || t('not_selected')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('status')}:</span>
                <span className={`font-medium ${form.watch('available') ? 'text-green-600' : 'text-red-600'}`}>
                  {form.watch('available') ? t('available') : t('unavailable')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('schedule')}:</span>
                <span className="font-medium">
                  {form.watch('weekday_visibility')?.length === 7 ? t('all_days') : 
                   `${form.watch('weekday_visibility')?.length || 0} ${t('day', { count: form.watch('weekday_visibility')?.length })}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">{t('tips_title')}</h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>{t('tip1')}</li>
              <li>{t('tip2')}</li>
              <li>{t('tip3')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
