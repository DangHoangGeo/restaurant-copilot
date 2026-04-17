'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Sparkles,
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

const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT, UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
];

const CURRENCIES = [
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'VND', label: 'VND - Vietnamese Dong' },
  { value: 'USD', label: 'USD - US Dollar' },
];

const COUNTRIES = [
  { value: 'JP', label: 'Japan' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'SG', label: 'Singapore' },
];

interface ControlOnboardingInitial {
  name: string;
  publicSubdomain: string;
  timezone: string;
  currency: string;
  country: string;
  logo_url: string | null;
  brand_color: string;
  description_en: string;
  description_ja: string;
  description_vi: string;
  website: string;
  phone: string;
  email: string;
}

interface ControlOnboardingContentProps {
  locale: string;
  initial: ControlOnboardingInitial;
  canEdit: boolean;
}

export function ControlOnboardingContent({
  locale,
  initial,
  canEdit,
}: ControlOnboardingContentProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: initial.name,
    publicSubdomain: initial.publicSubdomain,
    timezone: initial.timezone,
    currency: initial.currency,
    country: initial.country,
    logo_url: initial.logo_url ?? '',
    brand_color: initial.brand_color,
    description_en: initial.description_en,
    description_ja: initial.description_ja,
    description_vi: initial.description_vi,
    website: initial.website,
    phone: initial.phone,
    email: initial.email,
    cuisine: '',
    city: '',
    style: '',
    specialties: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/v1/owner/organization/onboarding/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.name,
          cuisine: form.cuisine,
          city: form.city,
          style: form.style,
          specialties: form.specialties,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to generate copy');
        return;
      }

      setForm((current) => ({
        ...current,
        description_en: data.description_en ?? current.description_en,
        description_ja: data.description_ja ?? current.description_ja,
        description_vi: data.description_vi ?? current.description_vi,
      }));
      toast.success('AI draft generated');
    } catch {
      toast.error('Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/v1/owner/organization/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          country: form.country,
          timezone: form.timezone,
          currency: form.currency,
          logo_url: form.logo_url || null,
          brand_color: form.brand_color,
          website: form.website || null,
          phone: form.phone || null,
          email: form.email || null,
          description_en: form.description_en || null,
          description_ja: form.description_ja || null,
          description_vi: form.description_vi || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to complete onboarding');
        return;
      }

      toast.success('Onboarding completed');
      router.push(`/${locale}/control/overview`);
      router.refresh();
    } catch {
      toast.error('Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  const disabled = !canEdit;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Company setup
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Set the defaults once before you build branches
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This onboarding is intentionally simple: company identity, the public subdomain, and multilingual brand copy that the owner can refine later.
            </p>
          </div>

          <div className="rounded-2xl border bg-muted/30 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Public subdomain
            </p>
            <p className="mt-1 text-sm font-medium">
              {form.publicSubdomain}.coorder.ai
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                disabled={disabled}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select
                  value={form.country}
                  onValueChange={(value) => set('country', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
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
                <Label>Timezone</Label>
                <Select
                  value={form.timezone}
                  onValueChange={(value) => set('timezone', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
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
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => set('currency', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
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
                <Label>Brand color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={(event) => set('brand_color', event.target.value)}
                    disabled={disabled}
                    className="h-11 w-14 rounded-2xl border bg-transparent p-1"
                  />
                  <Input
                    value={form.brand_color}
                    onChange={(event) => set('brand_color', event.target.value)}
                    disabled={disabled}
                    className="h-11 rounded-2xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.website}
                    onChange={(event) => set('website', event.target.value)}
                    disabled={disabled}
                    className="h-11 rounded-2xl pl-10"
                    placeholder="https://company.coorder.ai"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    disabled={disabled}
                    className="h-11 rounded-2xl pl-10"
                    placeholder="+81-3-0000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => set('email', event.target.value)}
                    disabled={disabled}
                    className="h-11 rounded-2xl pl-10"
                    placeholder="owner@company.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-muted/20 p-4">
            <Label>Company logo</Label>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Organization logo" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload the real logo now so the rest of the owner workspace starts from the correct brand asset.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
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
      </section>

      <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              AI draft support
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              Generate multilingual brand copy, then edit it freely
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Give the AI a little context about the business and it will draft English, Japanese, and Vietnamese introductions in the background.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || generating}
            className="rounded-2xl"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate copy
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cuisine focus</Label>
            <Input
              value={form.cuisine}
              onChange={(event) => set('cuisine', event.target.value)}
              disabled={disabled}
              className="h-11 rounded-2xl"
              placeholder="Vietnamese street food"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary city</Label>
            <Input
              value={form.city}
              onChange={(event) => set('city', event.target.value)}
              disabled={disabled}
              className="h-11 rounded-2xl"
              placeholder="Tokyo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand style</Label>
            <Input
              value={form.style}
              onChange={(event) => set('style', event.target.value)}
              disabled={disabled}
              className="h-11 rounded-2xl"
              placeholder="Warm, family-led, modern"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Specialties</Label>
            <Input
              value={form.specialties}
              onChange={(event) => set('specialties', event.target.value)}
              disabled={disabled}
              className="h-11 rounded-2xl"
              placeholder="Pho, bun cha, grilled meats"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              EN
            </span>
            <Textarea
              value={form.description_en}
              onChange={(event) => set('description_en', event.target.value)}
              disabled={disabled}
              className="min-h-24 rounded-2xl pl-12 pt-3"
              placeholder="English brand introduction"
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
              className="min-h-24 rounded-2xl pl-12 pt-3"
              placeholder="Japanese brand introduction"
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
              className="min-h-24 rounded-2xl pl-12 pt-3"
              placeholder="Vietnamese brand introduction"
            />
          </div>
        </div>
      </section>

      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="rounded-2xl px-5">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Complete onboarding
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          You need organization settings permission to finish onboarding.
        </p>
      )}
    </div>
  );
}
