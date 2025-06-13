'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { MenuItem, MenuItemCategory } from '@/shared/types/menu';
import { WeekdaySelector } from '@/components/features/admin/menu/WeekdaySelector';
import { PlusCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

// Zod Schemas
const toppingSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0),
});
type ToppingData = z.infer<typeof toppingSchema>;

const menuItemSizeSchema = z.object({
  id: z.string().optional(),
  size_key: z.string().min(1, "Size key is required (e.g., S, M, L)"),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0),
});
type MenuItemSizeData = z.infer<typeof menuItemSizeSchema>;

// Predefined size options
const PREDEFINED_SIZES = [
  { key: 'S', name_en: 'Small', name_ja: 'スモール', name_vi: 'Nhỏ', priceMultiplier: 0.8 },
  { key: 'M', name_en: 'Medium', name_ja: 'ミディアム', name_vi: 'Vừa', priceMultiplier: 1.0 },
  { key: 'L', name_en: 'Large', name_ja: 'ラージ', name_vi: 'Lớn', priceMultiplier: 1.3 },
];

const menuItemFormSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, "English name is required"),
  name_ja: z.string().optional(),
  name_vi: z.string().optional(),
  description_en: z.string().optional(),
  description_ja: z.string().optional(),
  description_vi: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  position: z.coerce.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  image_url: z.string().url("Invalid URL format").optional().or(z.literal('')),
  category_id: z.string().min(1, "Category is required"),
  available: z.boolean(),
  weekdayVisibility: z.array(z.number().min(1).max(7)),
  stock_level: z.coerce.number().min(0).optional().nullable(),
  imageFile: z.instanceof(File).optional().nullable(),
  toppings: z.array(toppingSchema).optional(),
  sizes: z.array(menuItemSizeSchema).optional(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  initialData?: MenuItem & {
    stock_level?: number;
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
  ownerLanguage?: 'en' | 'ja' | 'vi'; // Owner's preferred language
  onTranslate?: (text: string, field: string, context: 'item' | 'topping') => Promise<{ en: string; ja: string; vi: string }>;
  onGenerateDescription?: (text: string, initialData: string) => Promise<{ en: string; ja: string; vi: string }>;
}

export function MenuItemForm({ initialData, categories, onSave, onCancel, texts, ownerLanguage = 'en', onTranslate, onGenerateDescription }: MenuItemFormProps) {
  const t = useTranslations('AdminMenu');

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
      weekdayVisibility: initialData?.weekday_visibility || [],
      stock_level: initialData?.stock_level || 10,
      imageFile: null,
      toppings: initialData?.toppings?.map((top: ToppingData) => ({ ...top, position: top.position ?? 0 })) || [],
      sizes: initialData?.menu_item_sizes?.map((size: MenuItemSizeData) => ({ ...size, position: size.position ?? 0 })) || [],
    },
  });

  const { fields: toppingFields, append: appendTopping, remove: removeTopping } = useFieldArray({
    control: form.control,
    name: "toppings",
  });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes",
  });

  const [isToppingsOpen, setIsToppingsOpen] = useState(!!initialData?.toppings?.length);
  const [isSizesOpen, setIsSizesOpen] = useState(!!initialData?.menu_item_sizes?.length);

  const watchedSizes = form.watch("sizes");
  const hasSizes = watchedSizes && watchedSizes.length > 0;

  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Helper function to translate text
  const translateText = async (text: string, field: string, context: 'item' | 'topping' = 'item') => {
    if (!onTranslate || !text.trim()) return;
    
    setIsTranslating(true);
    try {
      const translations = await onTranslate(text, field, context);
      
      // Update form with translations
      if (context === 'item') {
        if (field.includes('name')) {
          form.setValue('name_en', translations.en);
          form.setValue('name_ja', translations.ja);
          form.setValue('name_vi', translations.vi);
        } 
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper function to generate description
  const generateDescription = async (text: string) => {
    if (!onGenerateDescription || !text.trim()) return;
    
    setIsGeneratingDescription(true);
    try {
      const item_name = ownerLanguage === 'en' ? form.getValues('name_en') : ownerLanguage === 'ja' ? form.getValues('name_ja') : form.getValues('name_vi');
      const generated = await onGenerateDescription(item_name || '', text || '');
      form.setValue('description_en', generated.en);
      form.setValue('description_ja', generated.ja);
      form.setValue('description_vi', generated.vi);
    } catch (error) {
      console.error('Description generation failed:', error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Helper function to add predefined sizes
  const addPredefinedSizes = () => {
    const currentPrice = form.getValues('price') || 0;
    const newSizes = PREDEFINED_SIZES.map((size, index) => ({
      size_key: size.key,
      name_en: size.name_en,
      name_ja: size.name_ja,
      name_vi: size.name_vi,
      price: Math.round(currentPrice * size.priceMultiplier * 100) / 100, // Round to 2 decimal places
      position: index,
    }));
    
    // Clear existing sizes and add predefined ones
    form.setValue('sizes', newSizes);
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        description_en: initialData.description_en || undefined,
        description_ja: initialData.description_ja || undefined,
        description_vi: initialData.description_vi || undefined,
        image_url: initialData.image_url || undefined,
        available: initialData.available === undefined ? true : initialData.available, // ensure boolean
        weekdayVisibility: initialData.weekday_visibility || [], // ensure array
        stock_level: initialData.stock_level || null,
        imageFile: null,
        toppings: initialData.toppings?.map((top: ToppingData) => ({ ...top, position: top.position ?? 0 })) || [],
        sizes: initialData.menu_item_sizes?.map((size: MenuItemSizeData) => ({ ...size, position: size.position ?? 0 })) || [],
      });
      setIsToppingsOpen(!!initialData.toppings?.length);
      setIsSizesOpen(!!initialData.menu_item_sizes?.length);
      setImagePreview(initialData.image_url || null);
    } else {
      form.reset({
        name_en: '',
        name_ja: '',
        name_vi: '',
        description_en: '',
        description_ja: '',
        description_vi: '',
        price: 0,
        position: 0,
        tags: [],
        image_url: '',
        category_id: '',
        available: true, // default
        weekdayVisibility: [], // default
        stock_level: null,
        imageFile: null,
        toppings: [],
        sizes: [],
      });
      setIsToppingsOpen(false);
      setIsSizesOpen(false);
      setImagePreview(null);
    }
  }, [initialData, form]); // Use form as dependency as per linter suggestion

  const onSubmit: SubmitHandler<MenuItemFormData> = async (data) => {
    console.log("Form data submitted:", data);
    await onSave(data, initialData?.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full md:max-w-4xl sm:max-h-[95vh] mx-auto">
        <div className="flex-1 space-y-4 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Column 1: Names, Descriptions */}
          <div className="space-y-4">
            {/* Primary language fields based on owner's language */}
            {ownerLanguage === 'en' && (
              <>
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.name_en_label')}*
                        {onTranslate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => translateText(field.value, 'name', 'item')}
                            disabled={isTranslating || !field.value}
                          >
                            {isTranslating ? '...' : '🌐'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('item.name_en_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.description_en_label')}
                        {generateDescription && field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => generateDescription(field.value || '')}
                            disabled={isGeneratingDescription}
                          >
                            {isGeneratingDescription ? '...' : '🌐'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder={t('item.description_en_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {ownerLanguage === 'ja' && (
              <>
                <FormField
                  control={form.control}
                  name="name_ja"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.name_ja_label')}*
                        {onTranslate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => translateText(field.value || '', 'name', 'item')}
                            disabled={isTranslating || !field.value}
                          >
                            {isTranslating ? '...' : 'translate'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder={t('item.name_ja_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_ja"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.description_ja_label')}
                        {generateDescription && field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => generateDescription(field.value || '')}
                            disabled={isGeneratingDescription}
                          >
                            {isGeneratingDescription ? '...' : '🌐'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder={t('item.description_ja_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {ownerLanguage === 'vi' && (
              <>
                <FormField
                  control={form.control}
                  name="name_vi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.name_vi_label')}*
                        {onTranslate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => translateText(field.value || '', 'name', 'item')}
                            disabled={isTranslating || !field.value}
                          >
                            {isTranslating ? '...' : '🌐'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder={t('item.name_vi_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_vi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('item.description_vi_label')}
                        {generateDescription && field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2 text-xs"
                            onClick={() => generateDescription(field.value || '')}
                            disabled={isGeneratingDescription}
                          >
                            {isGeneratingDescription ? '...' : '🌐'}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder={t('item.description_vi_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Show auto-generated translations in editable format */}
            {onTranslate && (
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('item.auto_translations_label')}
                </p>
                
                {/* Name translations */}
                {ownerLanguage !== 'en' && (
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.name_en_label')}</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" placeholder={t('item.auto_translate_name_en_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {ownerLanguage !== 'ja' && (
                  <FormField
                    control={form.control}
                    name="name_ja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.name_ja_label')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="h-8 text-sm" placeholder={t('item.auto_translate_name_ja_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {ownerLanguage !== 'vi' && (
                  <FormField
                    control={form.control}
                    name="name_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.name_vi_label')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="h-8 text-sm" placeholder={t('item.auto_translate_name_vi_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Description translations */}
                {ownerLanguage !== 'en' && (
                  <FormField
                    control={form.control}
                    name="description_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.description_en_label')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} className="h-16 text-sm" placeholder={t('item.auto_translate_description_en_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {ownerLanguage !== 'ja' && (
                  <FormField
                    control={form.control}
                    name="description_ja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.description_ja_label')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} className="h-16 text-sm" placeholder={t('item.auto_translate_description_ja_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {ownerLanguage !== 'vi' && (
                  <FormField
                    control={form.control}
                    name="description_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">{t('item.description_vi_label')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} className="h-16 text-sm" placeholder={t('item.auto_translate_description_vi_placeholder')} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
          </div>

          {/* Column 2: Price, Image, Stock, Availability, Category */}
          <div className="space-y-4">
            {/* Show current category if adding new item */}
            {initialData?.id === undefined ? (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('item.category_label')}</FormLabel>
                    <FormControl>
                      <Select {...field} value={field.value ?? ''}>
                        <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('item.category_label')}</FormLabel>
                    <FormControl>
                      <Select {...field} value={field.value ?? ''}>
                        <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('item.price_label')}*</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      disabled={hasSizes}
                    />
                  </FormControl>
                  {hasSizes && (
                    <FormDescription>{t('item.price_disabled_note')}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('item.image_label')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const options = {
                            maxSizeMB: 0.5,
                            maxWidthOrHeight: 800,
                            useWebWorker: true,
                          };
                          try {
                            const compressedFileBlob = await imageCompression(file, options);
                            const newFileObject = new File([compressedFileBlob], file.name, {
                              type: compressedFileBlob.type,
                              lastModified: Date.now(),
                            });
                            field.onChange(newFileObject);
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(newFileObject); // Corrected to use newFileObject
                          } catch (error) {
                            console.error("Error compressing image:", error);
                            toast.error(t('validation.compressionError'));
                            field.onChange(null);
                            setImagePreview(form.getValues("image_url") || null);
                            e.target.value = ''; // Clear the file input
                          }
                        } else {
                          field.onChange(null);
                          setImagePreview(form.getValues("image_url") || null);
                        }
                      }}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </FormControl>
                  {imagePreview && (
                    <div className="mt-2">
                      <Image src={imagePreview} alt={t('item.image_preview_alt')} width={160} height={160} className="max-h-40 w-auto rounded-md" />
                    </div>
                  )}
                  <FormMessage />
                  <FormDescription>{t('item.image_upload_note')}</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stock_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('item.stock_level_label')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value ?? ''} 
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t('item.available_label')}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="weekdayVisibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('item.weekday_visibility_label')}</FormLabel>
              <WeekdaySelector selectedDays={field.value || []} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toppings Section */}
        <Collapsible open={isToppingsOpen} onOpenChange={setIsToppingsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-start p-2 mb-2 text-lg font-semibold">
              {t('item.view_edit_toppings')} ({toppingFields.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 p-4 border rounded-md">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendTopping({ name_en: '', price: 0, position: toppingFields.length })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> {t('item.addTopping')}
            </Button>
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
                
                {/* Only show the owner's language field for topping names */}
                {ownerLanguage === 'en' && (
                  <FormField
                    control={form.control}
                    name={`toppings.${index}.name_en`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>
                          {t('item.topping_name_en_label')}
                          {onTranslate && f.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-6 px-2 text-xs"
                              onClick={async () => {
                                if (!onTranslate || !f.value) return;
                                setIsTranslating(true);
                                try {
                                  const translations = await onTranslate(f.value, 'name', 'topping');
                                  form.setValue(`toppings.${index}.name_en`, translations.en);
                                  form.setValue(`toppings.${index}.name_ja`, translations.ja);
                                  form.setValue(`toppings.${index}.name_vi`, translations.vi);
                                } catch (error) {
                                  console.error('Translation failed:', error);
                                } finally {
                                  setIsTranslating(false);
                                }
                              }}
                              disabled={isTranslating}
                            >
                              {isTranslating ? '...' : '🌐'}
                            </Button>
                          )}
                        </FormLabel>
                        <FormControl><Input placeholder={t('item.topping_name_en_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage === 'ja' && (
                  <FormField
                    control={form.control}
                    name={`toppings.${index}.name_ja`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>
                          {t('item.topping_name_ja_label')}
                          {onTranslate && f.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-6 px-2 text-xs"
                              onClick={async () => {
                                if (!onTranslate || !f.value) return;
                                setIsTranslating(true);
                                try {
                                  const translations = await onTranslate(f.value, 'name', 'topping');
                                  form.setValue(`toppings.${index}.name_en`, translations.en);
                                  form.setValue(`toppings.${index}.name_ja`, translations.ja);
                                  form.setValue(`toppings.${index}.name_vi`, translations.vi);
                                } catch (error) {
                                  console.error('Translation failed:', error);
                                } finally {
                                  setIsTranslating(false);
                                }
                              }}
                              disabled={isTranslating}
                            >
                              {isTranslating ? '...' : '🌐'}
                            </Button>
                          )}
                        </FormLabel>
                        <FormControl><Input placeholder={t('item.topping_name_ja_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage === 'vi' && (
                  <FormField
                    control={form.control}
                    name={`toppings.${index}.name_vi`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>
                          {t('item.topping_name_vi_label')}
                          {onTranslate && f.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-6 px-2 text-xs"
                              onClick={async () => {
                                if (!onTranslate || !f.value) return;
                                setIsTranslating(true);
                                try {
                                  const translations = await onTranslate(f.value, 'name', 'topping');
                                  form.setValue(`toppings.${index}.name_en`, translations.en);
                                  form.setValue(`toppings.${index}.name_ja`, translations.ja);
                                  form.setValue(`toppings.${index}.name_vi`, translations.vi);
                                } catch (error) {
                                  console.error('Translation failed:', error);
                                } finally {
                                  setIsTranslating(false);
                                }
                              }}
                              disabled={isTranslating}
                            >
                              {isTranslating ? '...' : '🌐'}
                            </Button>
                          )}
                        </FormLabel>
                        <FormControl><Input placeholder={t('item.topping_name_vi_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`toppings.${index}.price`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.topping_price_label')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder={t('item.topping_price_placeholder')} {...f} onChange={e => f.onChange(parseFloat(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`toppings.${index}.position`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.topping_position_label')}</FormLabel>
                        <FormControl><Input type="number" placeholder={t('item.topping_position_placeholder')} {...f} onChange={e => f.onChange(parseInt(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Sizes Section */}
        <Collapsible open={isSizesOpen} onOpenChange={setIsSizesOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-start p-2 mb-2 text-lg font-semibold">
              {t('item.view_edit_sizes')} ({sizeFields.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 p-4 border rounded-md">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPredefinedSizes}
                disabled={!form.getValues('price')}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> {t('item.add_standard_sizes')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSize({ size_key: '', name_en: '', price: 0, position: sizeFields.length })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> {t('item.add_custom_size')}
              </Button>
            </div>
            
            {!form.getValues('price') && (
              <p className="text-sm text-gray-500">{t('item.set_base_price_first')}</p>
            )}

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
                  control={form.control}
                  name={`sizes.${index}.size_key`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{t('item.size_key_label')}</FormLabel>
                      <FormControl><Input placeholder={t('item.size_key_placeholder')} {...f} /></FormControl>
                      <FormDescription>{t('item.size_key_note')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Only show the owner's language field for size names */}
                {ownerLanguage === 'en' && (
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.name_en`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.size_name_en_label')}</FormLabel>
                        <FormControl><Input placeholder={t('item.size_name_en_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage === 'ja' && (
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.name_ja`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.size_name_ja_label')}</FormLabel>
                        <FormControl><Input placeholder={t('item.size_name_ja_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {ownerLanguage === 'vi' && (
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.name_vi`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.size_name_vi_label')}</FormLabel>
                        <FormControl><Input placeholder={t('item.size_name_vi_placeholder')} {...f} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.price`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.size_price_label')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder={t('item.size_price_placeholder')} {...f} onChange={e => f.onChange(parseFloat(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.position`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{t('item.size_position_label')}</FormLabel>
                        <FormControl><Input type="number" placeholder={t('item.size_position_placeholder')} {...f} onChange={e => f.onChange(parseInt(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
        </div>

        {/* Fixed footer with buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={onCancel}>
            {texts.cancelButton}
          </Button>
          <Button type="submit">
            {texts.saveButton}
          </Button>
        </div>
      </form>
    </Form>
  );
}
