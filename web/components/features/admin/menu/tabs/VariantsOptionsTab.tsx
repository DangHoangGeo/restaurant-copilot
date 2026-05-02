'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { StreamlinedMenuItemFormData } from '../ItemModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Package, Plus, Sparkles, Trash2 } from 'lucide-react';

interface VariantsOptionsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  ownerLanguage: 'en' | 'ja' | 'vi';
  onTranslate?: (text: string, field: string, context: 'item' | 'topping') => Promise<{ en: string; ja: string; vi: string }>;
}

const PREDEFINED_SIZES = [
  { key: 'S', name_en: 'Small', name_ja: 'スモール', name_vi: 'Nhỏ', priceMultiplier: 0.8 },
  { key: 'M', name_en: 'Medium', name_ja: 'ミディアム', name_vi: 'Vừa', priceMultiplier: 1.0 },
  { key: 'L', name_en: 'Large', name_ja: 'ラージ', name_vi: 'Lớn', priceMultiplier: 1.3 },
];

const sectionClass = "rounded-xl border border-[#ead9c6] bg-[#fff8ee] shadow-sm dark:border-white/10 dark:bg-white/[0.05]";
const sectionHeaderClass = "flex items-center justify-between gap-3 border-b border-[#ead9c6] px-4 py-3 dark:border-white/10";
const rowClass = "grid gap-3 border-t border-[#ead9c6] px-4 py-4 first:border-t-0 dark:border-white/10";
const inputClass = "h-10 rounded-lg border-[#e2cfb8] bg-white/80 shadow-none dark:border-white/10 dark:bg-black/20";

export function VariantsOptionsTab({
  form,
  ownerLanguage,
  onTranslate
}: VariantsOptionsTabProps) {
  const t = useTranslations('owner.menu.itemModal.variants');

  const { fields: toppingFields, append: appendTopping, remove: removeTopping } = useFieldArray({
    control: form.control,
    name: "toppings",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes",
  });

  const addPredefinedSizes = () => {
    const currentPrice = form.getValues('price') || 0;
    const newSizes = PREDEFINED_SIZES.map((size, index) => ({
      size_key: size.key,
      name_en: size.name_en,
      name_ja: size.name_ja,
      name_vi: size.name_vi,
      price: Math.round(currentPrice * size.priceMultiplier * 100) / 100,
      position: index,
    }));

    form.setValue('sizes', newSizes);
  };

  const primaryNameField = ownerLanguage === 'en' ? 'name_en' :
                          ownerLanguage === 'ja' ? 'name_ja' : 'name_vi';

  const handleTranslateTopping = async (index: number, sourceText: string) => {
    if (!onTranslate || !sourceText.trim()) return;

    try {
      const translations = await onTranslate(sourceText, 'name', 'topping');
      form.setValue(`toppings.${index}.name_en`, translations.en);
      form.setValue(`toppings.${index}.name_ja`, translations.ja);
      form.setValue(`toppings.${index}.name_vi`, translations.vi);
      toast.success(t('translate_success'));
    } catch (error) {
      console.error('Translation failed:', error);
      toast.error(t('translate_error'));
    }
  };

  return (
    <div className="space-y-4 pb-4 text-[#2f2117] dark:text-[#f8eedf]">
      <div>
        <h3 className="text-lg font-semibold">{t('title')}</h3>
      </div>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="flex min-w-0 items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-[#9b6339] dark:text-[#f5b76d]" />
            <h4 className="truncate text-sm font-semibold">{t('stock_title')}</h4>
          </div>
          <FormField
            control={form.control}
            name="stock_level"
            render={({ field }) => (
              <FormItem className="w-28">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={event => field.onChange(event.target.value === '' ? null : parseInt(event.target.value, 10))}
                    placeholder={t('stock_unlimited')}
                    className={inputClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h4 className="text-sm font-semibold">{t('sizes_title')}</h4>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addPredefinedSizes} className="h-9 rounded-lg border-[#d8c2a8] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              S/M/L
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => appendSize({ size_key: '', name_en: '', name_ja: '', name_vi: '', price: form.getValues('price') || 0, position: sizeFields.length })} className="h-9 rounded-lg border-[#d8c2a8] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('sizes_add_custom')}
            </Button>
          </div>
        </div>
        <div>
          {sizeFields.map((field, index) => (
            <div key={field.id} className={rowClass}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#5b3d28] dark:text-[#f1d1b1]">
                  {t('sizes_title')} {index + 1}
                </p>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSize(index)} className="h-8 w-8 rounded-lg text-[#86583b] hover:bg-[#ead9c6] dark:text-[#f1d1b1] dark:hover:bg-white/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name={`sizes.${index}.size_key`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('sizes_code_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('sizes_code_placeholder')} {...f} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`sizes.${index}.price`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('sizes_price_label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...f}
                          onChange={event => f.onChange(parseFloat(event.target.value) || 0)}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name={`sizes.${index}.name_en`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t('sizes_name_label')} EN</FormLabel>
                    <FormControl>
                      <Input placeholder={t('sizes_name_placeholder')} {...f} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`sizes.${index}.name_ja`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_ja_name_label')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="小サイズ"
                          {...f}
                          value={f.value ?? ''}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`sizes.${index}.name_vi`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_vi_name_label')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nhỏ"
                          {...f}
                          value={f.value ?? ''}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h4 className="text-sm font-semibold">{t('toppings_title')}</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => appendTopping({ name_en: '', name_ja: '', name_vi: '', price: 0, position: toppingFields.length })} className="h-9 rounded-lg border-[#d8c2a8] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('toppings_add')}
          </Button>
        </div>
        <div>
          {toppingFields.map((field, index) => (
            <div key={field.id} className={rowClass}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#5b3d28] dark:text-[#f1d1b1]">
                  {t('toppings_title')} {index + 1}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTranslateTopping(index, form.getValues(`toppings.${index}.${primaryNameField}`) || '')}
                    disabled={!onTranslate}
                    className="h-8 rounded-lg px-2 text-[#86583b] hover:bg-[#ead9c6] dark:text-[#f1d1b1] dark:hover:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTopping(index)} className="h-8 w-8 rounded-lg text-[#86583b] hover:bg-[#ead9c6] dark:text-[#f1d1b1] dark:hover:bg-white/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <FormField
                  control={form.control}
                  name={`toppings.${index}.name_en`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_en_name_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('toppings_en_name_placeholder')} {...f} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`toppings.${index}.price`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_price_label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...f}
                          onChange={event => f.onChange(parseFloat(event.target.value) || 0)}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`toppings.${index}.name_ja`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_ja_name_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('toppings_ja_name_placeholder')} {...f} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`toppings.${index}.name_vi`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('toppings_vi_name_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('toppings_vi_name_placeholder')} {...f} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
