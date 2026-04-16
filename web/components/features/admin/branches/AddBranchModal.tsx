'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { X, Building2, Globe, Phone, Mail, MapPin, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const addBranchFormSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  subdomain: z
    .string()
    .min(3, 'At least 3 characters')
    .max(50, 'Max 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  default_language: z.enum(['en', 'ja', 'vi']),
  brand_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  tax: z.number().min(0).max(1).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email').max(100).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').max(200).optional().or(z.literal('')),
});

type AddBranchFormData = z.infer<typeof addBranchFormSchema>;

interface AddBranchModalProps {
  onClose: () => void;
  onSuccess: (branch: { id: string; name: string; subdomain: string }) => void;
}

export function AddBranchModal({ onClose, onSuccess }: AddBranchModalProps) {
  const t = useTranslations('owner.branches');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AddBranchFormData>({
    resolver: zodResolver(addBranchFormSchema),
    defaultValues: {
      name: '',
      subdomain: '',
      default_language: 'en',
      brand_color: '#3B82F6',
      tax: 0.1,
      address: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  const onSubmit = async (data: AddBranchFormData) => {
    setSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      email: data.email || undefined,
      website: data.website || undefined,
      address: data.address || undefined,
      phone: data.phone || undefined,
    };

    try {
      const res = await fetch('/api/v1/owner/organization/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          form.setError('subdomain', { message: t('addBranchSubdomainTaken') });
        } else {
          setServerError(json.error ?? t('addBranchError'));
        }
        return;
      }

      onSuccess(json.restaurant);
    } catch {
      setServerError(t('addBranchError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{t('addBranchTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('addBranchClose')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-5">
            {/* Restaurant Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {t('addBranchNameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('addBranchNamePlaceholder')} {...field} />
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
                  <FormLabel className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {t('addBranchSubdomainLabel')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        placeholder={t('addBranchSubdomainPlaceholder')}
                        {...field}
                        className="rounded-r-none"
                      />
                      <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm text-muted-foreground whitespace-nowrap">
                        .coorder.ai
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Default Language */}
              <FormField
                control={form.control}
                name="default_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addBranchLanguageLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                  <FormItem>
                    <FormLabel>{t('addBranchColorLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-12 h-9 p-1 rounded-md border cursor-pointer"
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

            {/* Optional fields */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('addBranchOptionalSection')}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5" />
                        {t('addBranchPhoneLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('addBranchPhonePlaceholder')} {...field} />
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
                      <FormLabel className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5" />
                        {t('addBranchEmailLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('addBranchEmailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('addBranchWebsiteLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder={t('addBranchWebsitePlaceholder')}
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
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('addBranchAddressLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('addBranchAddressPlaceholder')}
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                {t('addBranchCancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('addBranchSaving') : t('addBranchSave')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
