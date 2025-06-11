'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm, useFieldArray, Control, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Weekday, weekdays } from '@/lib/types/common.types';
import { MenuItemCategory } from '@/lib/types/menu-item-category.types';
import { MenuItem } from '@/lib/types/menu-item.types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Zod Schemas
const toppingSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0), // Changed: position is now a required number
});
type ToppingData = z.infer<typeof toppingSchema>; // Added type

const menuItemSizeSchema = z.object({
  id: z.string().optional(),
  size_key: z.string().min(1, "Size key is required (e.g., S, M, L)"),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0), // Changed: position is now a required number
});
type MenuItemSizeData = z.infer<typeof menuItemSizeSchema>; // Added type

const menuItemFormSchema = z.object({
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  description_en: z.string().optional(),
  description_ja: z.string().optional(),
  description_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  image_url: z.string().url("Invalid URL format").optional().or(z.literal('')),
  category_id: z.string().min(1, "Category is required"),
  available: z.boolean().default(true),
  weekdayVisibility: z.array(z.enum(weekdays)).default([]),
  toppings: z.array(toppingSchema).optional(),
  sizes: z.array(menuItemSizeSchema).optional(),
});

type MenuItemFormZodData = z.infer<typeof menuItemFormSchema>;
type MenuItemFormData = MenuItemFormZodData;

interface MenuItemFormProps {
  initialData?: MenuItem & {
    toppings?: ToppingData[];
    menu_item_sizes?: MenuItemSizeData[];
  };
  categories: MenuItemCategory[];
  onSave: (data: MenuItemFormData, menuItemId?: string) => Promise<void>;
  onCancel: () => void;
  texts: {
    saveButton: string;
    cancelButton: string;
    title: string;
    successMessage: string;
    errorMessage: string;
  };
}

export function MenuItemForm({ initialData, categories, onSave, onCancel, texts }: MenuItemFormProps) {
  const t = useTranslations('MenuItemForm');
  const tValidation = useTranslations('Validation'); // Kept for future use

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name_en: initialData?.name_en || '',
      name_ja: initialData?.name_ja || '',
      name_vi: initialData?.name_vi || '',
      description_en: initialData?.description_en || '',
      description_ja: initialData?.description_ja || '',
      description_vi: initialData?.description_vi || '',
      price: initialData?.price || 0,
      image_url: initialData?.image_url || '',
      category_id: initialData?.category_id || '',
      available: initialData?.available === undefined ? true : initialData.available,
      weekdayVisibility: initialData?.weekdayVisibility || [],
      toppings: initialData?.toppings?.map(t => ({ ...t, position: t.position ?? 0 })) || [], // Ensure position default
      sizes: initialData?.menu_item_sizes?.map(s => ({ ...s, position: s.position ?? 0 })) || [], // Ensure position default
    },
  });

  const { fields: toppingFields, append: appendTopping, remove: removeTopping } = useFieldArray({
    control: form.control, // Removed cast
    name: "toppings",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control, // Removed cast
    name: "sizes",
  });

  const [isToppingsOpen, setIsToppingsOpen] = useState(!!initialData?.toppings?.length);
  const [isSizesOpen, setIsSizesOpen] = useState(!!initialData?.menu_item_sizes?.length);

  const watchedSizes = form.watch("sizes");
  const hasSizes = watchedSizes && watchedSizes.length > 0;

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        weekdayVisibility: initialData.weekdayVisibility || [],
        toppings: initialData.toppings?.map(t => ({ ...t, position: t.position ?? 0 })) || [], // Ensure position default
        menu_item_sizes: initialData.menu_item_sizes?.map(s => ({ ...s, position: s.position ?? 0 })) || [], // Ensure position default
      });
      setIsToppingsOpen(!!initialData.toppings?.length);
      setIsSizesOpen(!!initialData.menu_item_sizes?.length);
    } else {
      form.reset({
        name_en: '',
        name_ja: '',
        name_vi: '',
        description_en: '',
        description_ja: '',
        description_vi: '',
        price: 0,
        image_url: '',
        category_id: '',
        available: true,
        weekdayVisibility: [],
        toppings: [],
        sizes: [],
      });
      setIsToppingsOpen(false);
      setIsSizesOpen(false);
    }
  }, [initialData, form.reset]);


  const onSubmit: SubmitHandler<MenuItemFormData> = async (data) => {
    console.log("Form data submitted:", data);
    await onSave(data, initialData?.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <FormLabel>{t('name_en_label')}</FormLabel>
            <FormControl>
              <Input placeholder={t('name_en_placeholder')} {...form.register('name_en')} />
            </FormControl>
            <FormMessage />
          </div>
          <div>
            <FormLabel>{t('name_ja_label')}</FormLabel>
            <FormControl>
              <Input placeholder={t('name_ja_placeholder')} {...form.register('name_ja')} />
            </FormControl>
            <FormMessage />
          </div>
          <div>
            <FormLabel>{t('name_vi_label')}</FormLabel>
            <FormControl>
              <Input placeholder={t('name_vi_placeholder')} {...form.register('name_vi')} />
            </FormControl>
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('description_en_label')}</FormLabel>
            <FormControl>
              <Textarea placeholder={t('description_en_placeholder')} {...form.register('description_en')} />
            </FormControl>
            <FormMessage />
          </div>
          <div>
            <FormLabel>{t('description_ja_label')}</FormLabel>
            <FormControl>
              <Textarea placeholder={t('description_ja_placeholder')} {...form.register('description_ja')} />
            </FormControl>
            <FormMessage />
          </div>
          <div>
            <FormLabel>{t('description_vi_label')}</FormLabel>
            <FormControl>
              <Textarea placeholder={t('description_vi_placeholder')} {...form.register('description_vi')} />
            </FormControl>
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('price_label')}</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="0.01" 
                placeholder={t('price_placeholder')} 
                {...form.register('price')}
                disabled={hasSizes} 
              />
            </FormControl>
            {hasSizes && (
              <FormDescription>{t('price_disabled_note')}</FormDescription>
            )}
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('image_label')}</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  form.setValue('imageFile', file);
                  form.setValue('image_url', URL.createObjectURL(file));
                }
              }} />
            </FormControl>
            <FormDescription>{t('image_upload_note')}</FormDescription>
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('category_label')}</FormLabel>
            <FormControl>
              <Select onValueChange={(value) => form.setValue('category_id', value)} defaultValue={initialData?.category_id}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('available_label')}</FormLabel>
            <FormControl>
              <Checkbox
                checked={form.watch('available')}
                onCheckedChange={(checked) => form.setValue('available', checked)}
              />
            </FormControl>
            <FormMessage />
          </div>

          <div>
            <FormLabel>{t('weekday_visibility_label')}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <Button
                  key={day}
                  variant={form.watch('weekdayVisibility').includes(day) ? 'default' : 'outline'}
                  onClick={() => {
                    const currentDays = form.getValues('weekdayVisibility') || [];
                    if (currentDays.includes(day)) {
                      form.setValue('weekdayVisibility', currentDays.filter(d => d !== day));
                    } else {
                      form.setValue('weekdayVisibility', [...currentDays, day]);
                    }
                  }}
                >
                  {t(`weekdays.${day.toLowerCase()}`)}
                </Button>
              ))}
            </div>
            <FormMessage />
          </div>

          {/* Toppings Section */}
          <div>
            <FormLabel>{t('toppings_label')}</FormLabel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => appendTopping({ name_en: '', price: 0, position: 0 })} // Added default position
              className="mt-2"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addTopping')}
            </Button>
            <Collapsible open={isToppingsOpen} onOpenChange={setIsToppingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 mb-2 text-lg font-semibold">
                  {t('view_edit_toppings')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 p-1 border rounded-md">
                {toppingFields.map((field, index) => (
      
      // Sizes to add or update
      if (data.sizes) {
        for (const size of data.sizes) {
          const sizePayload = { ...size };
          delete sizePayload.id;

          if (size.id) { // Update existing size
            // TODO: Implement API call: PUT /api/v1/menu-items/${itemId}/sizes/${size.id}
            console.log(`Simulating PUT size: ${size.id}`, sizePayload);
            // const updateResponse = await fetch(`/api/v1/menu-items/${itemId}/sizes/${size.id}`, {
            //   method: 'PUT',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(sizePayload),
            // });
            // if (!updateResponse.ok) throw new Error(\`Failed to update size ${size.id}\`);
          } else { // Create new size
            // TODO: Implement API call: POST /api/v1/menu-items/${itemId}/sizes
            console.log(`Simulating POST size for item ${itemId}:`, sizePayload);
            // const createResponse = await fetch(`/api/v1/menu-items/${itemId}/sizes`, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(sizePayload),
            // });
            // if (!createResponse.ok) throw new Error('Failed to create size');
          }
        }
      }

      toast(initialData?.id ? t('update_success_desc') : t('create_success_desc') );
      router.push(`/${locale}/dashboard/menu`);
      router.refresh();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast( error instanceof Error ? error.message : t('error_desc') );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <Form {...form}> { /* Pass the fully typed form object */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{initialData ? t('edit_title') : t('add_title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Name fields */}
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name_en_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name_en_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="name_ja"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name_ja_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name_ja_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="name_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name_vi_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name_vi_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description fields */}
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="description_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_en_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('description_en_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="description_ja"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_ja_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('description_ja_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="description_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_vi_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('description_vi_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="price"
              render={({ field }) => {
                const sizesArray = form.watch('sizes') || []; // Ensure sizesArray is always an array
                return (
                  <FormItem>
                    <FormLabel>{t('price_label')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={t('price_placeholder')} 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        disabled={sizesArray.length > 0} 
                      />
                    </FormControl>
                    {sizesArray.length > 0 && (
                      <FormDescription>{t('price_disabled_note')}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Image Upload */}
            <FormItem>
              <FormLabel>{t('image_label')}</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
              </FormControl>
              <FormDescription>{t('image_upload_note')}</FormDescription>
              <FormMessage />
              {imagePreview && (
                <div className="relative w-32 h-24 mt-2">
                  <Image src={imagePreview} alt="Image Preview" layout="fill" objectFit="cover" className="rounded-md" />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-0 right-0 m-1" onClick={handleClearImage}>
                    X
                  </Button>
                </div>
              )}
            </FormItem>

            {/* Stock Level */}
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="stockLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('stock_level_label')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder={t('stock_level_placeholder')} 
                      {...field} 
                      value={field.value === null ? '' : field.value} // Convert null to empty string for input value
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormDescription>{t('stock_level_note')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Available Checkbox */}
            <FormField
              control={form.control as Control<MenuItemFormData>} // Cast control
              name="available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t('is_available_label')}</FormLabel>
                    <FormDescription>{t('is_available_note')}</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Weekday Selector */}
            <div className="md:col-span-2">
              <WeekdaySelector selectedDays={selectedWeekdays} onChange={setSelectedWeekdays} />
            </div>

            {/* Toppings Section */}
            <div className="md:col-span-2">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2 mb-2 text-lg font-semibold">
                    {tToppings('title')} ({toppingFields.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-1 border rounded-md">
                  {toppingFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md space-y-3 bg-slate-50 dark:bg-slate-800/30 relative">
                       <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 p-1 h-auto text-red-500 hover:text-red-700"
                        onClick={() => removeTopping(index)}
                      >
                        <Trash2 size={18} />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`toppings.${index}.name_en`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tToppings('name_en_label')}</FormLabel>
                              <FormControl><Input placeholder={tToppings('name_en_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`toppings.${index}.name_ja`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tToppings('name_ja_label')}</FormLabel>
                              <FormControl><Input placeholder={tToppings('name_ja_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`toppings.${index}.name_vi`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tToppings('name_vi_label')}</FormLabel>
                              <FormControl><Input placeholder={tToppings('name_vi_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`toppings.${index}.price`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tToppings('price_label')}</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder={tToppings('price_placeholder')} {...f} onChange={e => f.onChange(parseFloat(e.target.value))} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`toppings.${index}.position`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tToppings('position_label')}</FormLabel>
                              <FormControl><Input type="number" placeholder={tToppings('position_placeholder')} {...f} onChange={e => f.onChange(parseInt(e.target.value))} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center gap-1"
                    onClick={() => appendTopping({ name_en: '', price: 0, position: 0, name_ja: '', name_vi: '' })}
                  >
                    <PlusCircle size={16} /> {tToppings('add_button')}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Sizes Section */}
            <div className="md:col-span-2">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2 mb-2 text-lg font-semibold">
                     {tSizes('title')} ({sizeFields.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-1 border rounded-md">
                  {sizeFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md space-y-3 bg-slate-50 dark:bg-slate-800/30 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 p-1 h-auto text-red-500 hover:text-red-700"
                        onClick={() => removeSize(index)}
                      >
                        <Trash2 size={18} />
                      </Button>
                      <FormField
                        control={form.control as Control<MenuItemFormData>} // Cast control
                        name={`sizes.${index}.size_key`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>{tSizes('size_key_label')}</FormLabel>
                            <FormControl><Input placeholder={tSizes('size_key_placeholder')} {...f} /></FormControl>
                            <FormDescription>{tSizes('size_key_note')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`sizes.${index}.name_en`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tSizes('name_en_label')}</FormLabel>
                              <FormControl><Input placeholder={tSizes('name_en_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`sizes.${index}.name_ja`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tSizes('name_ja_label')}</FormLabel>
                              <FormControl><Input placeholder={tSizes('name_ja_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`sizes.${index}.name_vi`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tSizes('name_vi_label')}</FormLabel>
                              <FormControl><Input placeholder={tSizes('name_vi_placeholder')} {...f} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`sizes.${index}.price`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tSizes('price_label')}</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder={tSizes('price_placeholder')} {...f} onChange={e => f.onChange(parseFloat(e.target.value))} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as Control<MenuItemFormData>} // Cast control
                          name={`sizes.${index}.position`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>{tSizes('position_label')}</FormLabel>
                              <FormControl><Input type="number" placeholder={tSizes('position_placeholder')} {...f} onChange={e => f.onChange(parseInt(e.target.value))} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center gap-1"
                    onClick={() => appendSize({ size_key: '', name_en: '', price: 0, position: 0, name_ja: '', name_vi: '' })}
                  >
                    <PlusCircle size={16} /> {tSizes('add_button')}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              {tCommon('cancel_button')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? tCommon('save_changes_button') : tCommon('create_button')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
