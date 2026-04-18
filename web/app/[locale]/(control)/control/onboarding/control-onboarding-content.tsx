'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Sparkles, Store } from 'lucide-react';
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
import type { Restaurant } from '@/shared/types/restaurant';

const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh' },
  { value: 'Asia/Singapore', label: 'Singapore' },
];

const CURRENCIES = [
  { value: 'JPY', label: 'JPY' },
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
];

const COUNTRIES = [
  { value: 'JP', label: 'Japan' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'SG', label: 'Singapore' },
];

const LANGUAGES = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
] as const;

type StepId = 'basics' | 'review';

type CompanyDraft = {
  name: string;
  publicSubdomain: string;
  timezone: string;
  currency: string;
  country: string;
  logo_url: string;
  brand_color: string;
  description_en: string;
  description_ja: string;
  description_vi: string;
  phone: string;
  email: string;
};

type BranchDraft = {
  id: string;
  name: string;
  branch_code: string;
  default_language: 'en' | 'ja' | 'vi';
  tax: string;
  address: string;
  opening_hours: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  hero_title_en: string;
  hero_title_ja: string;
  hero_title_vi: string;
  hero_subtitle_en: string;
  hero_subtitle_ja: string;
  hero_subtitle_vi: string;
  owner_story_en: string;
  owner_story_ja: string;
  owner_story_vi: string;
};

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
  const [step, setStep] = useState<StepId>('basics');
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState<CompanyDraft>({
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
    phone: initial.phone,
    email: initial.email,
  });

  const [basics, setBasics] = useState({
    ownerLanguage: (locale as 'en' | 'ja' | 'vi') || 'vi',
    ownerIntro:
      initial.description_vi ||
      initial.description_ja ||
      initial.description_en ||
      '',
    branchName: '',
    branchCode: '',
    address: '',
    openingHours: '',
    phone: initial.phone,
    email: initial.email,
  });

  const [branch, setBranch] = useState<BranchDraft>({
    id: '',
    name: '',
    branch_code: '',
    default_language: 'ja',
    tax: '10',
    address: '',
    opening_hours: '',
    phone: '',
    email: '',
    website: '',
    logo_url: initial.logo_url ?? '',
    hero_title_en: '',
    hero_title_ja: '',
    hero_title_vi: '',
    hero_subtitle_en: '',
    hero_subtitle_ja: '',
    hero_subtitle_vi: '',
    owner_story_en: '',
    owner_story_ja: '',
    owner_story_vi: '',
  });

  const disabled = !canEdit || saving;

  useEffect(() => {
    let active = true;

    const loadBranch = async () => {
      try {
        const response = await fetch('/api/v1/restaurant/settings', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load branch');
        }

        const restaurant = (await response.json()) as Restaurant;
        if (!active) return;

        setBranch((current) => ({
          ...current,
          id: restaurant.id,
          name: restaurant.name ?? '',
          branch_code: restaurant.branch_code ?? restaurant.subdomain ?? '',
          default_language: (restaurant.default_language ?? current.default_language) as 'en' | 'ja' | 'vi',
          tax: restaurant.tax != null ? String(Math.round(restaurant.tax * 100)) : current.tax,
          address: restaurant.address ?? '',
          opening_hours: restaurant.opening_hours ?? '',
          phone: restaurant.phone ?? '',
          email: restaurant.email ?? '',
          website: restaurant.website ?? '',
          logo_url: restaurant.logo_url ?? current.logo_url,
          hero_title_en: restaurant.hero_title_en ?? '',
          hero_title_ja: restaurant.hero_title_ja ?? '',
          hero_title_vi: restaurant.hero_title_vi ?? '',
          hero_subtitle_en: restaurant.hero_subtitle_en ?? '',
          hero_subtitle_ja: restaurant.hero_subtitle_ja ?? '',
          hero_subtitle_vi: restaurant.hero_subtitle_vi ?? '',
          owner_story_en: restaurant.owner_story_en ?? '',
          owner_story_ja: restaurant.owner_story_ja ?? '',
          owner_story_vi: restaurant.owner_story_vi ?? '',
        }));

        setBasics((current) => ({
          ...current,
          branchName: restaurant.name ?? current.branchName,
          branchCode: restaurant.branch_code ?? restaurant.subdomain ?? current.branchCode,
          address: restaurant.address ?? current.address,
          openingHours: restaurant.opening_hours ?? current.openingHours,
          phone: restaurant.phone ?? current.phone,
          email: restaurant.email ?? current.email,
        }));
      } catch {
        toast.error('Failed to load starter branch');
      } finally {
        if (active) {
          setLoadingBranch(false);
        }
      }
    };

    loadBranch();

    return () => {
      active = false;
    };
  }, []);

  const steps = useMemo(
    () => [
      { id: 'basics' as const, label: 'Basics', icon: Building2 },
      { id: 'review' as const, label: 'AI draft', icon: Sparkles },
    ],
    []
  );

  const applyAiDraft = async () => {
    if (!company.name.trim()) {
      toast.error('Add your company name');
      return false;
    }

    if (!basics.branchName.trim()) {
      toast.error('Add your branch name');
      return false;
    }

    if (!basics.address.trim()) {
      toast.error('Add your address');
      return false;
    }

    if (!basics.openingHours.trim()) {
      toast.error('Add opening hours');
      return false;
    }

    if (!basics.ownerIntro.trim()) {
      toast.error('Write a short introduction in your language');
      return false;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/v1/owner/organization/onboarding/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          branchName: basics.branchName,
          ownerLanguage: basics.ownerLanguage,
          ownerIntro: basics.ownerIntro,
          openingHours: basics.openingHours,
          city: basics.address,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to generate AI draft');
        return false;
      }

      setCompany((current) => ({
        ...current,
        phone: basics.phone,
        email: basics.email,
        brand_color: data.brand_color ?? current.brand_color,
        logo_url: data.logo_url ?? current.logo_url,
        description_en: data.description_en ?? current.description_en,
        description_ja: data.description_ja ?? current.description_ja,
        description_vi: data.description_vi ?? current.description_vi,
      }));

      setBranch((current) => ({
        ...current,
        name: basics.branchName,
        branch_code: basics.branchCode,
        address: basics.address,
        opening_hours: basics.openingHours,
        phone: basics.phone,
        email: basics.email,
        logo_url: data.logo_url ?? current.logo_url,
        hero_title_en: data.hero_title_en ?? current.hero_title_en,
        hero_title_ja: data.hero_title_ja ?? current.hero_title_ja,
        hero_title_vi: data.hero_title_vi ?? current.hero_title_vi,
        hero_subtitle_en: data.hero_subtitle_en ?? current.hero_subtitle_en,
        hero_subtitle_ja: data.hero_subtitle_ja ?? current.hero_subtitle_ja,
        hero_subtitle_vi: data.hero_subtitle_vi ?? current.hero_subtitle_vi,
        owner_story_en: data.owner_story_en ?? current.owner_story_en,
        owner_story_ja: data.owner_story_ja ?? current.owner_story_ja,
        owner_story_vi: data.owner_story_vi ?? current.owner_story_vi,
      }));

      toast.success('AI draft ready');
      return true;
    } catch {
      toast.error('Failed to generate AI draft');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const handleContinue = async () => {
    const success = await applyAiDraft();
    if (success) {
      setStep('review');
    }
  };

  const handleSave = async () => {
    if (!branch.id) {
      toast.error('Starter branch not loaded yet');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/v1/owner/organization/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: company.name,
          country: company.country,
          timezone: company.timezone,
          currency: company.currency,
          logo_url: company.logo_url || null,
          brand_color: company.brand_color,
          website: null,
          phone: basics.phone || null,
          email: basics.email || null,
          description_en: company.description_en || null,
          description_ja: company.description_ja || null,
          description_vi: company.description_vi || null,
          primary_branch: {
            id: branch.id,
            name: basics.branchName,
            branch_code: basics.branchCode,
            default_language: branch.default_language,
            tax: Number(branch.tax) / 100,
            address: basics.address || null,
            opening_hours: basics.openingHours || null,
            phone: basics.phone || null,
            email: basics.email || null,
            website: branch.website || null,
            logo_url: company.logo_url || branch.logo_url || null,
            hero_title_en: branch.hero_title_en || null,
            hero_title_ja: branch.hero_title_ja || null,
            hero_title_vi: branch.hero_title_vi || null,
            hero_subtitle_en: branch.hero_subtitle_en || null,
            hero_subtitle_ja: branch.hero_subtitle_ja || null,
            hero_subtitle_vi: branch.hero_subtitle_vi || null,
            owner_story_en: branch.owner_story_en || null,
            owner_story_ja: branch.owner_story_ja || null,
            owner_story_vi: branch.owner_story_vi || null,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to save setup');
        return;
      }

      toast.success('Setup completed');
      router.push(`/${locale}/control/overview`);
      router.refresh();
    } catch {
      toast.error('Failed to save setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Owner setup
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Tell us the basics
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We will generate the brand color, logo, and multilingual homepage draft for you.
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Company host
            </p>
            <p className="mt-1 text-sm font-medium break-all">
              {company.publicSubdomain}.coorder.ai
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = item.id === step;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-background/15' : 'bg-muted'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs opacity-70">0{index + 1}</span>
                  <span className="block text-sm font-medium">{item.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {step === 'basics' && (
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
          {loadingBranch ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading starter branch
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Company name</Label>
                  <Input
                    value={company.name}
                    onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))}
                    disabled={disabled}
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Select
                      value={company.country}
                      onValueChange={(value) => setCompany((current) => ({ ...current, country: value }))}
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
                      value={company.timezone}
                      onValueChange={(value) => setCompany((current) => ({ ...current, timezone: value }))}
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Currency</Label>
                    <Select
                      value={company.currency}
                      onValueChange={(value) => setCompany((current) => ({ ...current, currency: value }))}
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
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] border bg-muted/20 p-4">
                <div className="space-y-1.5">
                  <Label>Starter branch name</Label>
                  <Input
                    value={basics.branchName}
                    onChange={(event) => setBasics((current) => ({ ...current, branchName: event.target.value }))}
                    disabled={disabled}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Branch code</Label>
                  <Input
                    value={basics.branchCode}
                    onChange={(event) => setBasics((current) => ({ ...current, branchCode: event.target.value.toLowerCase() }))}
                    disabled={disabled}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={basics.address}
                    onChange={(event) => setBasics((current) => ({ ...current, address: event.target.value }))}
                    disabled={disabled}
                    className="h-11 rounded-2xl"
                    placeholder="Tokyo, Shibuya"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Opening hours</Label>
                  <Textarea
                    value={basics.openingHours}
                    onChange={(event) => setBasics((current) => ({ ...current, openingHours: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[90px] rounded-2xl"
                    placeholder="Mon-Sun 11:00-22:00"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={basics.phone}
                      onChange={(event) => setBasics((current) => ({ ...current, phone: event.target.value }))}
                      disabled={disabled}
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={basics.email}
                      onChange={(event) => setBasics((current) => ({ ...current, email: event.target.value }))}
                      disabled={disabled}
                      className="h-11 rounded-2xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Your language</Label>
                  <Select
                    value={basics.ownerLanguage}
                    onValueChange={(value) => setBasics((current) => ({ ...current, ownerLanguage: value as 'en' | 'ja' | 'vi' }))}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Short introduction in your language</Label>
                  <Textarea
                    value={basics.ownerIntro}
                    onChange={(event) => setBasics((current) => ({ ...current, ownerIntro: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[150px] rounded-2xl"
                    placeholder="Tell us who you are, what food you serve, and the feeling you want guests to have."
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'review' && (
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-4">
              <div className="rounded-[28px] border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Brand suggestion
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border bg-background">
                    {company.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={company.logo_url} alt="Generated logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Brand color</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: company.brand_color }} />
                        <Input
                          value={company.brand_color}
                          onChange={(event) => setCompany((current) => ({ ...current, brand_color: event.target.value }))}
                          disabled={disabled}
                          className="h-10 rounded-2xl font-mono"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="rounded-2xl" onClick={applyAiDraft} disabled={disabled || generating}>
                      {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Starter branch
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Store className="h-4 w-4" /> {basics.branchName}</div>
                  <div>{basics.address}</div>
                  <div>{basics.openingHours}</div>
                  <div>{basics.phone || 'No phone yet'}</div>
                  <div>{basics.email || 'No email yet'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 rounded-[28px] border bg-muted/20 p-5">
                <div className="space-y-1.5">
                  <Label>Company intro EN</Label>
                  <Textarea value={company.description_en} onChange={(event) => setCompany((current) => ({ ...current, description_en: event.target.value }))} disabled={disabled} className="min-h-[110px] rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Company intro JA</Label>
                  <Textarea value={company.description_ja} onChange={(event) => setCompany((current) => ({ ...current, description_ja: event.target.value }))} disabled={disabled} className="min-h-[110px] rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Company intro VI</Label>
                  <Textarea value={company.description_vi} onChange={(event) => setCompany((current) => ({ ...current, description_vi: event.target.value }))} disabled={disabled} className="min-h-[110px] rounded-2xl" />
                </div>
              </div>

              <div className="grid gap-4 rounded-[28px] border bg-muted/20 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Hero title EN</Label>
                    <Input value={branch.hero_title_en} onChange={(event) => setBranch((current) => ({ ...current, hero_title_en: event.target.value }))} disabled={disabled} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hero title JA</Label>
                    <Input value={branch.hero_title_ja} onChange={(event) => setBranch((current) => ({ ...current, hero_title_ja: event.target.value }))} disabled={disabled} className="h-11 rounded-2xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Hero subtitle EN</Label>
                  <Textarea value={branch.hero_subtitle_en} onChange={(event) => setBranch((current) => ({ ...current, hero_subtitle_en: event.target.value }))} disabled={disabled} className="min-h-[90px] rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner story EN</Label>
                  <Textarea value={branch.owner_story_en} onChange={(event) => setBranch((current) => ({ ...current, owner_story_en: event.target.value }))} disabled={disabled} className="min-h-[120px] rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setStep('basics')} disabled={step === 'basics' || saving}>
          Back
        </Button>
        {step === 'basics' ? (
          <Button type="button" className="rounded-2xl" onClick={handleContinue} disabled={disabled || loadingBranch || generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Create AI draft
          </Button>
        ) : (
          <Button type="button" className="rounded-2xl" onClick={handleSave} disabled={disabled || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}
