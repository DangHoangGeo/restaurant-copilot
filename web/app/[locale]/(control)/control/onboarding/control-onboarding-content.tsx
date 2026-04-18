'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { OperatingHoursEditor } from '@/components/features/admin/dashboard/OperatingHoursEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createDefaultOpeningHours,
  normalizeOpeningHours,
  summarizeOpeningHours,
  type OpeningHours,
} from '@/lib/utils/opening-hours';
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

const REVIEW_LANGUAGES = [
  {
    label: 'EN',
    titleKey: 'hero_title_en',
    subtitleKey: 'hero_subtitle_en',
    storyKey: 'owner_story_en',
  },
  {
    label: 'JA',
    titleKey: 'hero_title_ja',
    subtitleKey: 'hero_subtitle_ja',
    storyKey: 'owner_story_ja',
  },
  {
    label: 'VI',
    titleKey: 'hero_title_vi',
    subtitleKey: 'hero_subtitle_vi',
    storyKey: 'owner_story_vi',
  },
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
  address: string;
  phone: string;
  email: string;
};

type BranchSetupDraft = {
  ownerLanguage: 'en' | 'ja' | 'vi';
  ownerIntro: string;
  branchName: string;
  branchCode: string;
  branchAddress: string;
  branchPhone: string;
  branchEmail: string;
};

type BranchDraft = {
  id: string;
  name: string;
  branch_code: string;
  default_language: 'en' | 'ja' | 'vi';
  tax: string;
  opening_hours: OpeningHours;
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
  address: string;
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
  const previousCompanyContactRef = useRef({
    address: initial.address,
    phone: initial.phone,
    email: initial.email,
  });

  const [step, setStep] = useState<StepId>('basics');
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

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
    address: initial.address,
    phone: initial.phone,
    email: initial.email,
  });

  const [branchSetup, setBranchSetup] = useState<BranchSetupDraft>({
    ownerLanguage: (locale as 'en' | 'ja' | 'vi') || 'vi',
    ownerIntro:
      initial.description_vi ||
      initial.description_ja ||
      initial.description_en ||
      '',
    branchName: '',
    branchCode: '',
    branchAddress: initial.address,
    branchPhone: initial.phone,
    branchEmail: initial.email,
  });

  const [branch, setBranch] = useState<BranchDraft>({
    id: '',
    name: '',
    branch_code: '',
    default_language: 'ja',
    tax: '10',
    opening_hours: createDefaultOpeningHours(),
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

  const disabled = !canEdit || saving || uploadingLogo;

  // Persist form draft to localStorage so a refresh doesn't lose all input.
  const draftKey = `onboarding_draft_${initial.publicSubdomain}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        company?: Partial<CompanyDraft>;
        branchSetup?: Partial<BranchSetupDraft>;
        aiContent?: Partial<BranchDraft>;
      };
      if (draft.company) {
        setCompany((c) => ({ ...c, ...draft.company, publicSubdomain: c.publicSubdomain }));
      }
      if (draft.branchSetup) {
        setBranchSetup((b) => ({ ...b, ...draft.branchSetup }));
      }
      if (draft.aiContent) {
        setBranch((b) => ({ ...b, ...draft.aiContent }));
      }
    } catch {
      // Corrupt draft — ignore and start fresh.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            company: {
              name: company.name,
              timezone: company.timezone,
              currency: company.currency,
              country: company.country,
              brand_color: company.brand_color,
              address: company.address,
              phone: company.phone,
              email: company.email,
              description_en: company.description_en,
              description_ja: company.description_ja,
              description_vi: company.description_vi,
            },
            branchSetup,
            aiContent: {
              hero_title_en: branch.hero_title_en,
              hero_title_ja: branch.hero_title_ja,
              hero_title_vi: branch.hero_title_vi,
              hero_subtitle_en: branch.hero_subtitle_en,
              hero_subtitle_ja: branch.hero_subtitle_ja,
              hero_subtitle_vi: branch.hero_subtitle_vi,
              owner_story_en: branch.owner_story_en,
              owner_story_ja: branch.owner_story_ja,
              owner_story_vi: branch.owner_story_vi,
            },
          }),
        );
      } catch {
        // localStorage unavailable (private mode, storage full) — skip silently.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [company, branchSetup, branch.hero_title_en, branch.hero_title_ja, branch.hero_title_vi, branch.hero_subtitle_en, branch.hero_subtitle_ja, branch.hero_subtitle_vi, branch.owner_story_en, branch.owner_story_ja, branch.owner_story_vi, draftKey]);

  useEffect(() => {
    const previous = previousCompanyContactRef.current;

    setBranchSetup((current) => ({
      ...current,
      branchAddress:
        !current.branchAddress || current.branchAddress === previous.address
          ? company.address
          : current.branchAddress,
      branchPhone:
        !current.branchPhone || current.branchPhone === previous.phone
          ? company.phone
          : current.branchPhone,
      branchEmail:
        !current.branchEmail || current.branchEmail === previous.email
          ? company.email
          : current.branchEmail,
    }));

    previousCompanyContactRef.current = {
      address: company.address,
      phone: company.phone,
      email: company.email,
    };
  }, [company.address, company.email, company.phone]);

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
          opening_hours: normalizeOpeningHours(restaurant.opening_hours),
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

        setBranchSetup((current) => ({
          ...current,
          branchName: restaurant.name ?? current.branchName,
          branchCode: restaurant.branch_code ?? restaurant.subdomain ?? current.branchCode,
          branchAddress: restaurant.address ?? current.branchAddress,
          branchPhone: restaurant.phone ?? current.branchPhone,
          branchEmail: restaurant.email ?? current.branchEmail,
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
      { id: 'review' as const, label: 'Review', icon: Sparkles },
    ],
    []
  );

  const applyAiDraft = async () => {
    if (!company.name.trim()) {
      toast.error('Add your company name');
      return false;
    }

    if (!company.address.trim()) {
      toast.error('Add your company address');
      return false;
    }

    if (!company.phone.trim()) {
      toast.error('Add your company phone');
      return false;
    }

    if (!branchSetup.branchName.trim()) {
      toast.error('Add your first branch name');
      return false;
    }

    if (!branchSetup.branchAddress.trim()) {
      toast.error('Add your branch address');
      return false;
    }

    if (!branchSetup.ownerIntro.trim()) {
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
          branchName: branchSetup.branchName,
          ownerLanguage: branchSetup.ownerLanguage,
          ownerIntro: branchSetup.ownerIntro,
          openingHours: summarizeOpeningHours(branch.opening_hours),
          city: branchSetup.branchAddress,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to generate AI draft');
        return false;
      }

      setCompany((current) => ({
        ...current,
        brand_color: data.brand_color ?? current.brand_color,
        logo_url: data.logo_url ?? current.logo_url,
        description_en: data.description_en ?? current.description_en,
        description_ja: data.description_ja ?? current.description_ja,
        description_vi: data.description_vi ?? current.description_vi,
      }));

      setBranch((current) => ({
        ...current,
        name: branchSetup.branchName,
        branch_code: branchSetup.branchCode,
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

      setCompany((current) => ({
        ...current,
        logo_url: data.url ?? current.logo_url,
      }));
      setBranch((current) => ({
        ...current,
        logo_url: data.url ?? current.logo_url,
      }));
      toast.success('Logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const BRAND_COLOR_HEX_RE = /^#[0-9A-Fa-f]{6}$/;

  const handleSave = async () => {
    if (!branch.id) {
      toast.error('Starter branch not loaded yet');
      return;
    }

    if (!branch.hero_title_en.trim()) {
      toast.error('Add an English hero title before finishing — click "Create AI draft" or type one in the Review step');
      return;
    }

    if (!BRAND_COLOR_HEX_RE.test(company.brand_color)) {
      toast.error('Brand color must be a valid hex color (e.g. #C45B2D)');
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
          address: company.address || null,
          phone: company.phone || null,
          email: company.email || null,
          description_en: company.description_en || null,
          description_ja: company.description_ja || null,
          description_vi: company.description_vi || null,
          primary_branch: {
            id: branch.id,
            name: branchSetup.branchName,
            branch_code: branchSetup.branchCode,
            default_language: branch.default_language,
            tax: Number(branch.tax) / 100,
            address: branchSetup.branchAddress || null,
            opening_hours: branch.opening_hours,
            phone: branchSetup.branchPhone || null,
            email: branchSetup.branchEmail || null,
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

      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
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
              Set up your company and first branch
            </h2>
          </div>
          <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Company host
            </p>
            <p className="mt-1 break-all text-sm font-medium">
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

      {step === 'basics' ? (
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
          {loadingBranch ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading starter branch
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4 rounded-[28px] border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-base font-semibold">Company</h3>
                </div>

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

                <div className="space-y-1.5">
                  <Label>Company address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={company.address}
                      onChange={(event) => setCompany((current) => ({ ...current, address: event.target.value }))}
                      disabled={disabled}
                      className="h-11 rounded-2xl pl-10"
                      placeholder="2-1 Dogenzaka, Shibuya-ku, Tokyo"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Contact phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={company.phone}
                        onChange={(event) => setCompany((current) => ({ ...current, phone: event.target.value }))}
                        disabled={disabled}
                        className="h-11 rounded-2xl pl-10"
                        placeholder="+81-3-0000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Contact email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={company.email}
                        onChange={(event) => setCompany((current) => ({ ...current, email: event.target.value }))}
                        disabled={disabled}
                        className="h-11 rounded-2xl pl-10"
                        placeholder="contact@yourcompany.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-base font-semibold">Starter branch</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Branch name</Label>
                    <Input
                      value={branchSetup.branchName}
                      onChange={(event) => setBranchSetup((current) => ({ ...current, branchName: event.target.value }))}
                      disabled={disabled}
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Branch code</Label>
                    <Input
                      value={branchSetup.branchCode}
                      onChange={(event) =>
                        setBranchSetup((current) => ({
                          ...current,
                          branchCode: event.target.value.toLowerCase(),
                        }))
                      }
                      disabled={disabled}
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Branch language</Label>
                    <Select
                      value={branch.default_language}
                      onValueChange={(value) =>
                        setBranch((current) => ({
                          ...current,
                          default_language: value as 'en' | 'ja' | 'vi',
                        }))
                      }
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
                </div>

                <div className="space-y-1.5">
                  <Label>Branch address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={branchSetup.branchAddress}
                      onChange={(event) => setBranchSetup((current) => ({ ...current, branchAddress: event.target.value }))}
                      disabled={disabled}
                      className="h-11 rounded-2xl pl-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Branch phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={branchSetup.branchPhone}
                        onChange={(event) => setBranchSetup((current) => ({ ...current, branchPhone: event.target.value }))}
                        disabled={disabled}
                        className="h-11 rounded-2xl pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Branch email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={branchSetup.branchEmail}
                        onChange={(event) => setBranchSetup((current) => ({ ...current, branchEmail: event.target.value }))}
                        disabled={disabled}
                        className="h-11 rounded-2xl pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Opening hours</Label>
                    <span className="text-xs text-muted-foreground">
                      Used on the public homepage
                    </span>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <OperatingHoursEditor
                      value={branch.opening_hours}
                      onChange={(hours) =>
                        setBranch((current) => ({
                          ...current,
                          opening_hours: hours,
                        }))
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Your language</Label>
                  <Select
                    value={branchSetup.ownerLanguage}
                    onValueChange={(value) =>
                      setBranchSetup((current) => ({
                        ...current,
                        ownerLanguage: value as 'en' | 'ja' | 'vi',
                      }))
                    }
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
                  <Label>Short introduction</Label>
                  <Textarea
                    value={branchSetup.ownerIntro}
                    onChange={(event) => setBranchSetup((current) => ({ ...current, ownerIntro: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[140px] rounded-2xl"
                    placeholder="Tell us what kind of restaurant this is and what feeling guests should have."
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-4">
              <div className="rounded-[28px] border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Brand
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
                        <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: BRAND_COLOR_HEX_RE.test(company.brand_color) ? company.brand_color : 'transparent' }} />
                        <Input
                          value={company.brand_color}
                          onChange={(event) => setCompany((current) => ({ ...current, brand_color: event.target.value }))}
                          disabled={disabled}
                          className="h-10 rounded-2xl font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Logo</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={disabled}
                        >
                          {uploadingLogo ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="mr-2 h-4 w-4" />
                          )}
                          {company.logo_url ? 'Replace logo' : 'Upload logo'}
                        </Button>
                        {company.logo_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-2xl text-destructive hover:text-destructive"
                            onClick={() => {
                              setCompany((current) => ({
                                ...current,
                                logo_url: '',
                              }));
                              setBranch((current) => ({
                                ...current,
                                logo_url: '',
                              }));
                            }}
                            disabled={disabled}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        PNG, JPG, WebP, or AVIF.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="hidden"
                        onChange={handleLogoSelected}
                        disabled={disabled}
                      />
                    </div>

                    {showRegenerateConfirm ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                        <span className="text-destructive">Overwrite your edits?</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-7 rounded-xl px-3 text-xs"
                          onClick={async () => { setShowRegenerateConfirm(false); await applyAiDraft(); }}
                          disabled={generating}
                        >
                          Yes, regenerate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-xl px-3 text-xs"
                          onClick={() => setShowRegenerateConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          if (branch.hero_title_en.trim()) {
                            setShowRegenerateConfirm(true);
                          } else {
                            void applyAiDraft();
                          }
                        }}
                        disabled={disabled || generating}
                      >
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Company
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div>{company.name}</div>
                  <div>{company.address}</div>
                  <div>{company.phone}</div>
                  <div>{company.email || 'No email yet'}</div>
                </div>
              </div>

              <div className="rounded-[28px] border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Starter branch
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {branchSetup.branchName}
                  </div>
                  <div>{branchSetup.branchAddress}</div>
                  <div>{summarizeOpeningHours(branch.opening_hours)}</div>
                  <div>{branchSetup.branchPhone || 'No phone yet'}</div>
                  <div>{branchSetup.branchEmail || 'No email yet'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 rounded-[28px] border bg-muted/20 p-5">
                <div className="space-y-1.5">
                  <Label>Company intro EN</Label>
                  <Textarea
                    value={company.description_en}
                    onChange={(event) => setCompany((current) => ({ ...current, description_en: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company intro JA</Label>
                  <Textarea
                    value={company.description_ja}
                    onChange={(event) => setCompany((current) => ({ ...current, description_ja: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company intro VI</Label>
                  <Textarea
                    value={company.description_vi}
                    onChange={(event) => setCompany((current) => ({ ...current, description_vi: event.target.value }))}
                    disabled={disabled}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-[28px] border bg-muted/20 p-5">
                {REVIEW_LANGUAGES.map((language) => (
                  <div key={language.label} className="space-y-3 rounded-2xl border bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Homepage copy {language.label}
                    </p>
                    <div className="space-y-1.5">
                      <Label>Hero title {language.label}</Label>
                      <Input
                        value={branch[language.titleKey]}
                        onChange={(event) =>
                          setBranch((current) => ({
                            ...current,
                            [language.titleKey]: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hero subtitle {language.label}</Label>
                      <Textarea
                        value={branch[language.subtitleKey]}
                        onChange={(event) =>
                          setBranch((current) => ({
                            ...current,
                            [language.subtitleKey]: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        className="min-h-[90px] rounded-2xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Owner story {language.label}</Label>
                      <Textarea
                        value={branch[language.storyKey]}
                        onChange={(event) =>
                          setBranch((current) => ({
                            ...current,
                            [language.storyKey]: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        className="min-h-[120px] rounded-2xl"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={() => setStep('basics')}
          disabled={step === 'basics' || saving}
        >
          Back
        </Button>
        {step === 'basics' ? (
          <Button
            type="button"
            className="rounded-2xl"
            onClick={handleContinue}
            disabled={disabled || loadingBranch || generating}
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Create AI draft
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-2xl"
            onClick={handleSave}
            disabled={disabled || saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}
