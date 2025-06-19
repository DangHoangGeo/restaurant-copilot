'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { StreamlinedMenuItemFormData } from '../ItemModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ChevronDown, Package, PlusCircle, Sparkles, Trash2, Ruler, Plus } from 'lucide-react';

interface VariantsOptionsTabProps {
  form: UseFormReturn<StreamlinedMenuItemFormData>;
  ownerLanguage: 'en' | 'ja' | 'vi';
  onTranslate?: (text: string, field: string, context: 'item' | 'topping') => Promise<{ en: string; ja: string; vi: string }>;
}

// Predefined size options
const PREDEFINED_SIZES = [
  { key: 'S', name_en: 'Small', name_ja: 'スモール', name_vi: 'Nhỏ', priceMultiplier: 0.8 },
  { key: 'M', name_en: 'Medium', name_ja: 'ミディアム', name_vi: 'Vừa', priceMultiplier: 1.0 },
  { key: 'L', name_en: 'Large', name_ja: 'ラージ', name_vi: 'Lớn', priceMultiplier: 1.3 },
];

export function VariantsOptionsTab({
  form,
  ownerLanguage,
  onTranslate
}: VariantsOptionsTabProps) {
  const t = useTranslations('owner.menu.itemModal.variants');
  const [isToppingsOpen, setIsToppingsOpen] = useState(false);
  const [isSizesOpen, setIsSizesOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);

  const { fields: toppingFields, append: appendTopping, remove: removeTopping } = useFieldArray({
    control: form.control,
    name: "toppings",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes",
  });

  // Auto-open sections when they have data
  useEffect(() => {
    if (toppingFields.length > 0) {
      setIsToppingsOpen(true);
    }
    if (sizeFields.length > 0) {
      setIsSizesOpen(true);
    }
  }, [toppingFields.length, sizeFields.length]);

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
    setIsSizesOpen(true);
  };

  const primaryNameField = ownerLanguage === 'en' ? 'name_en' : 
                          ownerLanguage === 'ja' ? 'name_ja' : 'name_vi';

  // Helper function to translate topping names
  const handleTranslateTopping = async (index: number, sourceText: string) => {
    if (!onTranslate || !sourceText.trim()) return;
    
    try {
      const translations = await onTranslate(sourceText, 'name', 'topping');
      
      // Auto-fill all language fields for the topping
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
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Stock Level Management */}
        <Card>
          <Collapsible open={isStockOpen} onOpenChange={setIsStockOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t('stock_title')}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('stock_current', { stock_level: form.watch('stock_level') || t('stock_unlimited') })}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isStockOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="stock_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('stock_label')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                          placeholder={t('stock_placeholder')}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t('stock_description')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Size Variants */}
        <Card>
          <Collapsible open={isSizesOpen} onOpenChange={setIsSizesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t('sizes_title')}</CardTitle>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isSizesOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={addPredefinedSizes}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('sizes_add_predefined')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => appendSize({ size_key: '', name_en: '', name_ja: '', name_vi: '', price: form.getValues('price') || 0, position: sizeFields.length })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('sizes_add_custom')}
                  </Button>
                </div>
                <div className="space-y-4">
                  {sizeFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-grow">
                        <FormField
                          control={form.control}
                          name={`sizes.${index}.size_key`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{t('sizes_code_label')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('sizes_code_placeholder')} {...f} />
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
                                  onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`sizes.${index}.name_en`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{t('sizes_name_label')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('sizes_name_placeholder')} {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSize(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Toppings */}
        <Card>
          <Collapsible open={isToppingsOpen} onOpenChange={setIsToppingsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t('toppings_title')}</CardTitle>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isToppingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <Button type="button" variant="outline" onClick={() => appendTopping({ name_en: '', name_ja: '', name_vi: '', price: 0, position: toppingFields.length })}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('toppings_add')}
                </Button>
                <div className="space-y-4">
                  {toppingFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.${primaryNameField}`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>{t('toppings_name_label', { language: ownerLanguage.toUpperCase() })}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('toppings_name_placeholder')} {...f} />
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
                                    onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTopping(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => handleTranslateTopping(index, form.getValues(`toppings.${index}.${primaryNameField}`) || '')}
                          disabled={!onTranslate}
                        >
                          <Sparkles className="mr-2 h-4 w-4 text-primary" />
                          {t('toppings_translate_button')}
                        </Button>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.name_en`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>{t('toppings_en_name_label')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('toppings_en_name_placeholder')} {...f} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`toppings.${index}.name_ja`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>{t('toppings_ja_name_label')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('toppings_ja_name_placeholder')} {...f} />
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
                                  <Input placeholder={t('toppings_vi_name_placeholder')} {...f} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Quick Summary */}
      {(sizeFields.length > 0 || toppingFields.length > 0 || form.watch('stock_level')) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">{t('summary_title')}</h4>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
