'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowRight, Building2, Globe, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import type { BasicInfoStepProps } from "../types";

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  default_language: z.enum(['en', 'ja', 'vi']),
  brand_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  tax: z.number().min(0).max(1).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email address').max(100).optional().or(z.literal('')),
  website: z.string().url('Invalid website URL').max(200).optional().or(z.literal('')),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

export function BasicInfoStep({ data, onUpdate, onNext, locale }: BasicInfoStepProps) {
  const t = useTranslations('owner.onboarding.steps.basic');

  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: data.name || '',
      subdomain: data.subdomain || '',
      default_language: data.default_language || locale as 'en' | 'ja' | 'vi',
      brand_color: data.brand_color || '#3B82F6',
      tax: data.tax || 0.10,
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
    },
  });

  const onSubmit = (formData: BasicInfoFormData) => {
    // Convert empty strings to undefined for optional fields
    const cleanData = {
      ...formData,
      tax: formData.tax || 0.10,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
    };
    
    onUpdate(cleanData);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Restaurant Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('fields.name.label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fields.name.placeholder')}
                        {...field}
                        className="text-lg font-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subdomain */}
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('fields.subdomain.label')}
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          placeholder={t('fields.subdomain.placeholder')}
                          {...field}
                          className="rounded-r-none"
                        />
                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 border border-l-0 rounded-r-md text-sm text-gray-600 dark:text-gray-400">
                          .coorder.ai
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default Language */}
              <FormField
                control={form.control}
                name="default_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.language.label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fields.language.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand Color */}
              <FormField
                control={form.control}
                name="brand_color"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('fields.brandColor.label')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="color"
                          {...field}
                          className="w-16 h-12 p-1 rounded-md border"
                        />
                        <Input
                          {...field}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Contact Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">{t('sections.contact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t('fields.phone.label')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('fields.phone.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('fields.email.label')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('fields.email.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        {t('fields.website.label')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder={t('fields.website.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t('fields.address.label')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('fields.address.placeholder')}
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.tax.label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          placeholder={t('fields.tax.placeholder')}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="submit" className="flex items-center gap-2">
                {t('buttons.continue')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
