'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import {
  Globe,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT, UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'UTC', label: 'UTC' },
];

const CURRENCIES = [
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'VND', label: 'VND - Vietnamese Dong' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
];

const COUNTRIES = [
  { value: 'JP', label: 'Japan' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'SG', label: 'Singapore' },
  { value: 'US', label: 'United States' },
];

interface OrgSettingsInitial {
  name: string;
  timezone: string;
  currency: string;
  country: string;
  logo_url: string | null;
  brand_color: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
}

interface ControlSettingsContentProps {
  initial: OrgSettingsInitial;
  canEdit: boolean;
}

export function ControlSettingsContent({
  initial,
  canEdit,
}: ControlSettingsContentProps) {
  const [form, setForm] = useState({
    name: initial.name,
    timezone: initial.timezone,
    currency: initial.currency,
    country: initial.country,
    logo_url: initial.logo_url ?? '',
    brand_color: initial.brand_color ?? '#3B82F6',
    description_en: initial.description_en ?? '',
    description_ja: initial.description_ja ?? '',
    description_vi: initial.description_vi ?? '',
    website: initial.website ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingLogo(true);

    try {
      const body = new FormData();
      body.set('file', file);

      const response = await fetch('/api/v1/owner/organization/logo', {
        method: 'POST',
        body,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error ?? 'Failed to upload logo');
        return;
      }

      set('logo_url', data.url);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name || undefined,
        country: form.country || undefined,
        timezone: form.timezone || undefined,
        currency: form.currency || undefined,
        logo_url: form.logo_url || null,
        brand_color: form.brand_color || null,
        description_en: form.description_en || null,
        description_ja: form.description_ja || null,
        description_vi: form.description_vi || null,
        website: form.website || null,
        phone: form.phone || null,
        email: form.email || null,
      };

      const response = await fetch('/api/v1/owner/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Organization settings saved');
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const disabled = !canEdit;

  return (
    <div className="max-w-3xl space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b bg-gradient-to-br from-amber-50 via-background to-emerald-50 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Shared identity
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Keep the company setup simple for every branch
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set the brand once here, then let branches inherit the default look,
            contact details, and business rules unless a branch truly needs an override.
          </p>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Organization name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  disabled={disabled}
                  className="h-10 rounded-xl"
                  placeholder="Your Company Name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(value) => set('country', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Timezone</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(value) => set('timezone', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((timezone) => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Default currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => set('currency', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Brand color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.brand_color}
                      onChange={(event) => set('brand_color', event.target.value)}
                      disabled={disabled}
                      className="h-10 w-14 cursor-pointer rounded-xl border bg-transparent p-1"
                    />
                    <Input
                      value={form.brand_color}
                      onChange={(event) => set('brand_color', event.target.value)}
                      disabled={disabled}
                      className="h-10 rounded-xl font-mono"
                      maxLength={7}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <Label className="text-xs font-medium">Organization logo</Label>
              <div className="mt-3 flex items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
                  {form.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logo_url}
                      alt="Organization logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a real logo file so owners do not need to manage image URLs manually.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-2 h-4 w-4" />
                      )}
                      {form.logo_url ? 'Replace logo' : 'Upload logo'}
                    </Button>
                    {form.logo_url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={() => set('logo_url', '')}
                        disabled={disabled || uploadingLogo}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WebP. Up to 5MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelected}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.website}
                  onChange={(event) => set('website', event.target.value)}
                  disabled={disabled}
                  className="h-10 rounded-xl pl-9"
                  placeholder="https://yourrestaurant.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contact phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.phone}
                  onChange={(event) => set('phone', event.target.value)}
                  disabled={disabled}
                  className="h-10 rounded-xl pl-9"
                  placeholder="+81-3-0000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Contact email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                  disabled={disabled}
                  className="h-10 rounded-xl pl-9"
                  placeholder="contact@yourcompany.com"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Public introduction</h3>
          <p className="text-sm text-muted-foreground">
            Keep the public story short and usable. Branches can inherit this language as their default baseline.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              EN
            </span>
            <Textarea
              value={form.description_en}
              onChange={(event) => set('description_en', event.target.value)}
              disabled={disabled}
              className="min-h-24 rounded-2xl pl-12 pt-3 text-sm"
              placeholder="Authentic Vietnamese food for busy city life."
              maxLength={1000}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              JA
            </span>
            <Textarea
              value={form.description_ja}
              onChange={(event) => set('description_ja', event.target.value)}
              disabled={disabled}
              className="min-h-24 rounded-2xl pl-12 pt-3 text-sm"
              placeholder="本格ベトナム料理を、毎日の営業で迷わず届けるための基準文です。"
              maxLength={1000}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              VI
            </span>
            <Textarea
              value={form.description_vi}
              onChange={(event) => set('description_vi', event.target.value)}
              disabled={disabled}
              className="min-h-24 rounded-2xl pl-12 pt-3 text-sm"
              placeholder="Mô tả ngắn gọn, rõ ràng để mọi chi nhánh có thể kế thừa."
              maxLength={1000}
            />
          </div>
        </div>
      </section>

      {canEdit ? (
        <Button onClick={handleSave} disabled={saving} className="rounded-2xl px-5">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save settings
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          You need organization settings permission to edit these fields.
        </p>
      )}
    </div>
  );
}
