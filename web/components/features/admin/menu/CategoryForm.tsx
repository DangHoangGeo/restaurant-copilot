'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Schema from 04_admin-dashboard.md 4.3.2
const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "validation.required_field" }).max(50, { message: "validation.max_length_50" }),
  position: z.coerce.number().optional().nullable(), // coerce to handle string from input type="number"
});
type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  initialData?: { id: string; name: string; position?: number | null; restaurant_id: string };
  restaurantId: string;
  locale: string;
}

export function CategoryForm({ initialData, locale }: CategoryFormProps) {
  const t = useTranslations('owner.menu.category');
  //const tValidation = useTranslations('Validation');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      position: initialData?.position ?? undefined,
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      let response;
      if (initialData?.id) { // Editing
        response = await fetch(`/api/v1/owner/categories/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      } else { // Creating
        response = await fetch('/api/v1/owner/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save category.');
      }

      toast(initialData?.id ? t('update_success_desc') : t('create_success_desc'));
      router.push(`/${locale}/branch/menu`);
      router.refresh();
    } catch (error) {
      console.error("Error saving category:", error);
      toast(error instanceof Error ? error.message : t('error_desc') );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{initialData ? t('edit_title') : t('add_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('position_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('position_placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              {t('cancel_button')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? t('save_changes_button') : t('create_button')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
