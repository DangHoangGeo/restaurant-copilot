'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

// Define the schema for multi-language text
const localizedStringSchema = z.object({
  en: z.string().min(1, { message: "validation.required_field" }).max(100, { message: "validation.max_length_100" }),
  ja: z.string().max(100, { message: "validation.max_length_100" }).optional(),
  vi: z.string().max(100, { message: "validation.max_length_100" }).optional(),
}).partial().refine(data => data.en || data.ja || data.vi, {
  message: "validation.at_least_one_language_required",
  path: ["en"],
});

const menuItemFormSchema = z.object({
  name_en: z.string().min(1, { message: "validation.required_field" }).max(100, { message: "validation.max_length_100" }),
  name_ja: z.string().max(100, { message: "validation.max_length_100" }).optional(),
  name_vi: z.string().max(100, { message: "validation.max_length_100" }).optional(),
  description_en: z.string().max(500, { message: "validation.max_length_500" }).optional(),
  description_ja: z.string().max(500, { message: "validation.max_length_500" }).optional(),
  description_vi: z.string().max(500, { message: "validation.max_length_500" }).optional(),
  price: z.coerce.number().min(0.01, { message: "validation.min_price" }),
  imageUrl: z.string().url({ message: "validation.invalid_url" }).optional().nullable(), // This will be for existing URL
  imageFile: z.any().optional(), // For new file upload
  available: z.boolean(),
  weekdayVisibility: z.array(z.string()),
  stockLevel: z.coerce.number().int().min(0, { message: "validation.min_stock" }).optional().nullable(),
  clearImage: z.boolean().optional(), // For clearing existing image
}).refine(data => data.name_en || data.name_ja || data.name_vi, {
  message: "validation.at_least_one_language_required",
  path: ["name_en"],
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  initialData?: { 
    id: string; 
    name: { en: string; ja?: string; vi?: string; }; 
    description?: { en: string; ja?: string; vi?: string; }; 
    price: number; 
    image_url?: string | null; 
    available: boolean; 
    weekday_visibility: string[]; 
    stock_level?: number | null;
    category_id: string;
    restaurant_id: string;
  };
  restaurantId: string;
  categoryId: string;
  locale: string;
}

const WeekdaySelector = ({ selectedDays, onChange }: { selectedDays: string[], onChange: (days: string[]) => void }) => {
  const t = useTranslations('Common'); // Assuming common translations for weekdays
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div>
      <FormLabel className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('admin.menu.item.weekday_visibility')}</FormLabel>
      <div className="flex flex-wrap gap-2">
        {days.map(day => (
          <label key={day} className="flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg cursor-pointer hover:border-[--brand-color] has-[:checked]:bg-[--brand-color]/10 has-[:checked]:border-[--brand-color]">
            <Checkbox
              checked={selectedDays.includes(day)}
              onCheckedChange={(checked: boolean) => { // Explicitly type 'checked'
                const newDays = checked ? [...selectedDays, day] : selectedDays.filter(d => d !== day);
                onChange(newDays);
              }}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t(`weekdays.${day.toLowerCase()}`)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};


export function MenuItemForm({ initialData, restaurantId, categoryId, locale }: MenuItemFormProps) {
  const t = useTranslations('AdminMenuPage.item_form');
  const tCommon = useTranslations('Common');
  const tValidation = useTranslations('Validation');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(initialData?.weekday_visibility || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name_en: initialData?.name?.en || '',
      name_ja: initialData?.name?.ja || '',
      name_vi: initialData?.name?.vi || '',
      description_en: initialData?.description?.en || '',
      description_ja: initialData?.description?.ja || '',
      description_vi: initialData?.description?.vi || '',
      price: initialData?.price || 0,
      imageUrl: initialData?.image_url || null,
      available: initialData?.available ?? true,
      weekdayVisibility: initialData?.weekday_visibility || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      stockLevel: initialData?.stock_level ?? null,
      clearImage: false,
    },
  });

  useEffect(() => {
    // Update image preview if initialData.image_url changes (e.g., when switching between items)
    setImagePreview(initialData?.image_url || null);
    setSelectedWeekdays(initialData?.weekday_visibility || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    form.reset({
      name_en: initialData?.name?.en || '',
      name_ja: initialData?.name?.ja || '',
      name_vi: initialData?.name?.vi || '',
      description_en: initialData?.description?.en || '',
      description_ja: initialData?.description?.ja || '',
      description_vi: initialData?.description?.vi || '',
      price: initialData?.price || 0,
      imageUrl: initialData?.image_url || null,
      available: initialData?.available ?? true,
      weekdayVisibility: initialData?.weekday_visibility || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      stockLevel: initialData?.stock_level ?? null,
      clearImage: false,
    });
  }, [initialData, form]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('imageFile', file);
      setImagePreview(URL.createObjectURL(file));
      form.setValue('clearImage', false); // If new image is selected, don't clear
    } else {
      form.setValue('imageFile', undefined);
      if (!initialData?.image_url) { // Only clear preview if no initial image
        setImagePreview(null);
      }
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    form.setValue('imageFile', undefined);
    form.setValue('imageUrl', null); // Clear the existing URL from form state
    form.setValue('clearImage', true); // Set flag to clear image on backend
  };

  const onSubmit = async (data: MenuItemFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name.en', data.name_en);
      if (data.name_ja) formData.append('name.ja', data.name_ja);
      if (data.name_vi) formData.append('name.vi', data.name_vi);
      if (data.description_en) formData.append('description.en', data.description_en);
      if (data.description_ja) formData.append('description.ja', data.description_ja);
      if (data.description_vi) formData.append('description.vi', data.description_vi);
      formData.append('price', data.price.toString());
      formData.append('available', data.available.toString());
      formData.append('weekdayVisibility', JSON.stringify(selectedWeekdays)); // Use selectedWeekdays state
      if (data.stockLevel !== null && data.stockLevel !== undefined) formData.append('stockLevel', data.stockLevel.toString());
      
      if (data.imageFile) {
        formData.append('imageFile', data.imageFile);
      } else if (initialData?.image_url && !data.clearImage) {
        formData.append('existingImageUrl', initialData.image_url);
      } else if (data.clearImage) {
        formData.append('clearImage', 'true');
      }

      let response;
      if (initialData?.id) { // Editing
        response = await fetch(`/api/v1/categories/${categoryId}/items/${initialData.id}`, {
          method: 'PUT',
          body: formData, // Use FormData for file uploads
        });
      } else { // Creating
        response = await fetch(`/api/v1/categories/${categoryId}/items`, {
          method: 'POST',
          body: formData, // Use FormData for file uploads
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save menu item.');
      }

      toast(initialData?.id ? t('update_success_desc') : t('create_success_desc') );
      router.push(`/${locale}/dashboard/menu`);
      router.refresh();
    } catch (error: any) {
      console.error("Error saving menu item:", error);
      toast( error.message || t('error_desc') );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <Form<MenuItemFormData> {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{initialData ? t('edit_title') : t('add_title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Name fields */}
            <FormField
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('price_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t('price_placeholder')} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
            <FormField<MenuItemFormData>
              control={form.control}
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
