'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  companyPublicSubdomain?: string | null;
  onClose: () => void;
  onSuccess: (branch: { id: string; name: string; subdomain: string }) => void;
}

function toBranchCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function AddBranchModal({
  companyPublicSubdomain,
  onClose,
  onSuccess,
}: AddBranchModalProps) {
  const t = useTranslations('owner.branches');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [branchCodeEdited, setBranchCodeEdited] = useState(false);

  const form = useForm<AddBranchFormData>({
    resolver: zodResolver(addBranchFormSchema),
    defaultValues: {
      name: '',
      subdomain: '',
      default_language: 'ja',
      brand_color: '#EA580C',
      tax: 0.1,
      address: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  const watchedName = form.watch('name');

  useEffect(() => {
    if (!branchCodeEdited) {
      form.setValue('subdomain', toBranchCode(watchedName), {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [branchCodeEdited, form, watchedName]);

  const onSubmit = async (data: AddBranchFormData) => {
    setSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      subdomain: toBranchCode(data.subdomain),
      email: data.email || undefined,
      website: data.website || undefined,
      address: data.address || undefined,
      phone: data.phone || undefined,
    };

    try {
      const response = await fetch('/api/v1/owner/organization/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border bg-background shadow-2xl">
        <div className="border-b bg-gradient-to-br from-orange-50 via-background to-amber-50 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Add restaurant
                </h2>
              </div>
              {companyPublicSubdomain ? (
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  {companyPublicSubdomain}.coorder.ai
                </div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label={t('addBranchClose')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 py-5 sm:px-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Restaurant name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('addBranchNamePlaceholder')}
                        {...field}
                        className="h-11 rounded-2xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Branch code
                    </FormLabel>
                    <FormControl>
                      <div className="rounded-2xl border bg-muted/30 p-1">
                        <div className="flex items-center rounded-[14px] bg-background">
                          <Input
                            placeholder="shinjuku-east"
                            {...field}
                            onChange={(event) => {
                              setBranchCodeEdited(true);
                              field.onChange(toBranchCode(event.target.value));
                            }}
                            className="h-11 rounded-r-none border-0 bg-transparent shadow-none"
                          />
                          <div className="shrink-0 rounded-r-[14px] border-l bg-muted px-3 text-sm text-muted-foreground">
                            {companyPublicSubdomain ? `${companyPublicSubdomain}.coorder.ai` : 'coorder.ai'}/menu?branch=
                            <span className="font-medium text-foreground">
                              {field.value || 'branch-code'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Default language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Accent color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          {...field}
                          className="h-11 w-14 cursor-pointer rounded-2xl border bg-transparent p-1"
                        />
                        <Input
                          {...field}
                          placeholder="#EA580C"
                          className="h-11 rounded-2xl font-mono"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="rounded-3xl border bg-muted/20 p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Contact details</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+81-3-0000-0000"
                          {...field}
                          className="h-11 rounded-2xl"
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
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="branch@company.com"
                          {...field}
                          className="h-11 rounded-2xl"
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
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://branch.example.com"
                          {...field}
                          className="h-11 rounded-2xl"
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
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Address
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tokyo, Shinjuku..."
                          {...field}
                          rows={3}
                          className="rounded-2xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {serverError ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="rounded-2xl"
                onClick={onClose}
                disabled={submitting}
              >
                {t('addBranchCancel')}
              </Button>
              <Button type="submit" className="rounded-2xl" disabled={submitting}>
                <Plus className="mr-2 h-4 w-4" />
                {submitting ? t('addBranchSaving') : 'Create restaurant'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
