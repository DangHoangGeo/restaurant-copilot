'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
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
import { cn } from '@/lib/utils';
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

const STEPS = [
  {
    id: 'company',
    label: 'Company',
    hint: 'Brand foundation',
    icon: Building2,
  },
  {
    id: 'brand',
    label: 'AI brand',
    hint: 'Choose a direction',
    icon: Sparkles,
  },
  {
    id: 'branch',
    label: 'First branch',
    hint: 'Starter setup',
    icon: Store,
  },
  {
    id: 'review',
    label: 'Finish',
    hint: 'Save and continue',
    icon: Check,
  },
] as const;

const BRAND_COLOR_HEX_RE = /^#([0-9A-Fa-f]{6})$/;

type StepId = (typeof STEPS)[number]['id'];

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
  serviceFocus: string;
};

type BranchSetupDraft = {
  ownerLanguage: 'en' | 'ja' | 'vi';
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

type BrandOption = {
  id: string;
  name: string;
  summary: string;
  brand_color: string;
  accent_color: string;
  logo_url: string | null;
};

type MenuCategorySuggestion = {
  key: string;
  name_en: string;
  name_ja: string;
  name_vi: string;
  kind: 'basic' | 'specialty';
};

type StoredOnboardingDraft = {
  company?: Partial<CompanyDraft>;
  branchSetup?: Partial<BranchSetupDraft>;
  branch?: Partial<BranchDraft>;
  brandOptions?: BrandOption[];
  selectedBrandOptionId?: string | null;
  categorySuggestions?: MenuCategorySuggestion[];
  selectedCategoryKeys?: string[];
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

function getCategoryKey(category: {
  name_en?: string | null;
  name_ja?: string | null;
  name_vi?: string | null;
}) {
  const source =
    category.name_en?.trim() ||
    category.name_ja?.trim() ||
    category.name_vi?.trim() ||
    '';

  return source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getLocalizedValue(
  locale: 'en' | 'ja' | 'vi',
  values: { en?: string; ja?: string; vi?: string }
) {
  return values[locale] || values.en || values.ja || values.vi || '';
}

function getLocalizedCategoryName(
  locale: 'en' | 'ja' | 'vi',
  category: MenuCategorySuggestion
) {
  if (locale === 'ja') return category.name_ja || category.name_en;
  if (locale === 'vi') return category.name_vi || category.name_en;
  return category.name_en;
}

function sanitizeBranchCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function StepButton({
  label,
  hint,
  index,
  isActive,
  isDone,
  icon: Icon,
  onClick,
}: {
  label: string;
  hint: string;
  index: number;
  isActive: boolean;
  isDone: boolean;
  icon: typeof Building2;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'rounded-[22px] px-4 py-3 text-left transition ring-1 ring-inset',
        isActive
          ? 'bg-foreground text-background ring-foreground/15'
          : isDone
            ? 'bg-background/90 text-foreground ring-border/60 hover:bg-background'
            : 'bg-background/65 text-muted-foreground ring-border/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] opacity-70">
            0{index + 1}
          </p>
          <p className="mt-2 text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs opacity-70">{hint}</p>
        </div>
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-2xl',
            isActive ? 'bg-background/10' : 'bg-muted'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
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

  const [step, setStep] = useState<StepId>('company');
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
    serviceFocus:
      initial.description_vi || initial.description_ja || initial.description_en || '',
  });

  const [branchSetup, setBranchSetup] = useState<BranchSetupDraft>({
    ownerLanguage: (locale as 'en' | 'ja' | 'vi') || 'vi',
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

  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [selectedBrandOptionId, setSelectedBrandOptionId] = useState<string | null>(null);
  const [categorySuggestions, setCategorySuggestions] = useState<MenuCategorySuggestion[]>([]);
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);

  const disabled = !canEdit || saving || uploadingLogo;
  const draftKey = `control_onboarding_draft_${initial.publicSubdomain}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      const draft = JSON.parse(raw) as StoredOnboardingDraft;
      if (draft.company) {
        setCompany((current) => ({
          ...current,
          ...draft.company,
          publicSubdomain: current.publicSubdomain,
        }));
      }
      if (draft.branchSetup) {
        setBranchSetup((current) => ({ ...current, ...draft.branchSetup }));
      }
      if (draft.branch) {
        setBranch((current) => ({ ...current, ...draft.branch }));
      }
      if (draft.brandOptions) {
        setBrandOptions(draft.brandOptions);
      }
      if (draft.selectedBrandOptionId !== undefined) {
        setSelectedBrandOptionId(draft.selectedBrandOptionId);
      }
      if (draft.categorySuggestions) {
        setCategorySuggestions(draft.categorySuggestions);
      }
      if (draft.selectedCategoryKeys) {
        setSelectedCategoryKeys(draft.selectedCategoryKeys);
      }
    } catch {
      // Ignore stale or corrupt local draft payloads.
    }
  }, [draftKey]);

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
              logo_url: company.logo_url,
              brand_color: company.brand_color,
              description_en: company.description_en,
              description_ja: company.description_ja,
              description_vi: company.description_vi,
              address: company.address,
              phone: company.phone,
              email: company.email,
              serviceFocus: company.serviceFocus,
            },
            branchSetup,
            branch,
            brandOptions,
            selectedBrandOptionId,
            categorySuggestions,
            selectedCategoryKeys,
          } satisfies StoredOnboardingDraft)
        );
      } catch {
        // localStorage can be unavailable in some browser modes.
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    branch,
    brandOptions,
    branchSetup,
    categorySuggestions,
    company,
    draftKey,
    selectedBrandOptionId,
    selectedCategoryKeys,
  ]);

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
          default_language: (restaurant.default_language ?? current.default_language) as
            | 'en'
            | 'ja'
            | 'vi',
          tax:
            restaurant.tax != null
              ? String(Math.round(restaurant.tax * 100))
              : current.tax,
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
          branchCode:
            restaurant.branch_code ??
            restaurant.subdomain ??
            current.branchCode,
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

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);
  const previewLanguage = branchSetup.ownerLanguage;

  const selectedBrandOption = useMemo(
    () => brandOptions.find((option) => option.id === selectedBrandOptionId) ?? null,
    [brandOptions, selectedBrandOptionId]
  );

  const selectedCategories = useMemo(
    () =>
      categorySuggestions.filter((category) =>
        selectedCategoryKeys.includes(category.key)
      ),
    [categorySuggestions, selectedCategoryKeys]
  );

  const previewCompanyDescription = getLocalizedValue(previewLanguage, {
    en: company.description_en,
    ja: company.description_ja,
    vi: company.description_vi,
  });

  const previewHeroTitle = getLocalizedValue(previewLanguage, {
    en: branch.hero_title_en,
    ja: branch.hero_title_ja,
    vi: branch.hero_title_vi,
  });

  const previewHeroSubtitle = getLocalizedValue(previewLanguage, {
    en: branch.hero_subtitle_en,
    ja: branch.hero_subtitle_ja,
    vi: branch.hero_subtitle_vi,
  });

  const previewOwnerStory = getLocalizedValue(previewLanguage, {
    en: branch.owner_story_en,
    ja: branch.owner_story_ja,
    vi: branch.owner_story_vi,
  });

  const applyAiDraft = async () => {
    if (!company.name.trim()) {
      toast.error('Add your company name');
      return false;
    }

    if (!company.serviceFocus.trim()) {
      toast.error('Describe what makes your food or service special');
      return false;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/v1/owner/organization/onboarding/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          branchName: branchSetup.branchName || undefined,
          ownerLanguage: branchSetup.ownerLanguage,
          ownerIntro: company.serviceFocus,
          openingHours: summarizeOpeningHours(branch.opening_hours),
          city: company.address || branchSetup.branchAddress || undefined,
          specialties: company.serviceFocus,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to generate AI suggestions');
        return false;
      }

      const nextBrandOptions = Array.isArray(data.brand_options)
        ? (data.brand_options as BrandOption[])
        : [];
      const nextCategorySuggestions = Array.isArray(data.food_category_suggestions)
        ? (
            data.food_category_suggestions as Array<{
              name_en?: string;
              name_ja?: string;
              name_vi?: string;
              kind?: string;
            }>
          )
            .map((category) => ({
              key: getCategoryKey(category) || `category-${Math.random().toString(36).slice(2, 8)}`,
              name_en: category.name_en?.trim() || '',
              name_ja: category.name_ja?.trim() || category.name_en?.trim() || '',
              name_vi: category.name_vi?.trim() || category.name_en?.trim() || '',
<<<<<<< HEAD
              kind: category.kind === 'specialty' ? 'specialty' : 'basic' as 'basic' | 'specialty',
=======
              kind: category.kind === 'specialty' ? 'specialty' : 'basic',
>>>>>>> e6e3e96 (feat(onboarding): Enhance organization onboarding with AI-generated branding and shared menu categories)
            }))
            .filter((category) => category.name_en.length > 0)
        : [];

      const uniqueCategories: MenuCategorySuggestion[] = [];
      const seenCategoryKeys = new Set<string>();
      nextCategorySuggestions.forEach((category) => {
        if (!seenCategoryKeys.has(category.key)) {
          seenCategoryKeys.add(category.key);
          uniqueCategories.push(category);
        }
      });

      const defaultBrandOption = nextBrandOptions[0] ?? null;

      setBrandOptions(nextBrandOptions);
      setSelectedBrandOptionId(defaultBrandOption?.id ?? null);
      setCategorySuggestions(uniqueCategories);
      setSelectedCategoryKeys(uniqueCategories.map((category) => category.key));

      setCompany((current) => ({
        ...current,
        logo_url: defaultBrandOption?.logo_url ?? current.logo_url,
        brand_color:
          defaultBrandOption?.brand_color ??
          data.brand_color ??
          current.brand_color,
        description_en: data.description_en ?? current.description_en,
        description_ja: data.description_ja ?? current.description_ja,
        description_vi: data.description_vi ?? current.description_vi,
      }));

      setBranch((current) => ({
        ...current,
        name: branchSetup.branchName || current.name,
        branch_code: branchSetup.branchCode || current.branch_code,
        logo_url: defaultBrandOption?.logo_url ?? current.logo_url,
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

      setShowRegenerateConfirm(false);
      setStep('brand');
      toast.success('AI brand suggestions are ready');
      return true;
    } catch {
      toast.error('Failed to generate AI suggestions');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectBrandOption = (option: BrandOption) => {
    setSelectedBrandOptionId(option.id);
    setCompany((current) => ({
      ...current,
      brand_color: option.brand_color,
      logo_url: option.logo_url ?? current.logo_url,
    }));
    setBranch((current) => ({
      ...current,
      logo_url: option.logo_url ?? current.logo_url,
    }));
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

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

  const validateBrandStep = () => {
    if (brandOptions.length === 0) {
      toast.error('Generate brand suggestions first');
      return false;
    }

    if (selectedCategories.length === 0) {
      toast.error('Select at least one shared food category');
      return false;
    }

    if (!BRAND_COLOR_HEX_RE.test(company.brand_color)) {
      toast.error('Brand color must be a valid hex color like #B65A2E');
      return false;
    }

    return true;
  };

  const validateBranchStep = () => {
    if (!branch.id) {
      toast.error('Starter branch is still loading');
      return false;
    }

    if (!branchSetup.branchName.trim()) {
      toast.error('Add your first branch name');
      return false;
    }

    if (!sanitizeBranchCode(branchSetup.branchCode)) {
      toast.error('Add a branch code using letters, numbers, or hyphens');
      return false;
    }

    if (!branchSetup.branchAddress.trim()) {
      toast.error('Add your branch address');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBrandStep() || !validateBranchStep()) {
      return;
    }

    if (!branch.hero_title_en.trim()) {
      toast.error('AI did not prepare homepage copy yet. Try generating again.');
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
          shared_menu_categories: selectedCategories.map((category) => ({
            name_en: category.name_en,
            name_ja: category.name_ja || null,
            name_vi: category.name_vi || null,
          })),
          primary_branch: {
            id: branch.id,
            name: branchSetup.branchName.trim(),
            branch_code: sanitizeBranchCode(branchSetup.branchCode),
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

      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore draft cleanup issues.
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

  const handleNext = async () => {
    if (step === 'company') {
      await applyAiDraft();
      return;
    }

    if (step === 'brand') {
      if (!validateBrandStep()) return;
      setStep('branch');
      return;
    }

    if (step === 'branch') {
      if (!validateBranchStep()) return;
      setStep('review');
      return;
    }

    await handleSave();
  };

  const handleBack = () => {
    if (step === 'brand') {
      setStep('company');
      return;
    }

    if (step === 'branch') {
      setStep('brand');
      return;
    }

    if (step === 'review') {
      setStep('branch');
    }
  };

  const nextButtonLabel =
    step === 'company'
      ? 'Generate brand suggestions'
      : step === 'brand'
        ? 'Continue to branch'
        : step === 'branch'
          ? 'Review setup'
          : 'Finish setup';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-50 via-background to-orange-100/70 p-6 ring-1 ring-amber-100 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(234,88,12,0.18),transparent_52%)]"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Owner setup
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Build the company first, then let branches inherit it.
            </h2>
          </div>

          <div className="rounded-[24px] bg-background/85 px-4 py-3 text-right ring-1 ring-border/50 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Company host
            </p>
            <p className="mt-1 break-all text-sm font-semibold">
              {company.publicSubdomain}.coorder.ai
            </p>
          </div>
        </div>

        <div className="relative mt-6 grid gap-2 sm:grid-cols-4">
          {STEPS.map((item, index) => (
            <StepButton
              key={item.id}
              label={item.label}
              hint={item.hint}
              index={index}
              icon={item.icon}
              isActive={item.id === step}
              isDone={index < currentStepIndex}
              onClick={index < currentStepIndex ? () => setStep(item.id) : undefined}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[32px] bg-card p-5 ring-1 ring-border/50 sm:p-8">
        {step === 'company' ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 1</p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Start with the company profile
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company-name">Company name</Label>
                  <Input
                    id="company-name"
                    value={company.name}
                    onChange={(event) =>
                      setCompany((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    disabled={disabled}
                    className="h-12 rounded-2xl"
                    placeholder="Sakura Dining Group"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select
                    value={company.country}
                    onValueChange={(value) =>
                      setCompany((current) => ({ ...current, country: value }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
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
                    onValueChange={(value) =>
                      setCompany((current) => ({ ...current, timezone: value }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
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
                    onValueChange={(value) =>
                      setCompany((current) => ({ ...current, currency: value }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
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

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company-address">Company address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-address"
                      value={company.address}
                      onChange={(event) =>
                        setCompany((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className="h-12 rounded-2xl pl-10"
                      placeholder="2-1 Dogenzaka, Shibuya-ku, Tokyo"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company-phone">Contact phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-phone"
                      value={company.phone}
                      onChange={(event) =>
                        setCompany((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className="h-12 rounded-2xl pl-10"
                      placeholder="+81-3-0000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company-email">Contact email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-email"
                      type="email"
                      value={company.email}
                      onChange={(event) =>
                        setCompany((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className="h-12 rounded-2xl pl-10"
                      placeholder="contact@yourcompany.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company-story">What makes your food or service unique?</Label>
                  <Textarea
                    id="company-story"
                    value={company.serviceFocus}
                    onChange={(event) =>
                      setCompany((current) => ({
                        ...current,
                        serviceFocus: event.target.value,
                      }))
                    }
                    disabled={disabled}
                    className="min-h-[180px] rounded-[24px]"
                    placeholder="Tell us what guests come back for, how your food feels, what your signature service style is, and what should stay consistent across branches."
                  />
                </div>
              </div>
            </div>

            <aside className="rounded-[28px] bg-muted/35 p-5 ring-1 ring-border/50">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Next
                  </p>
                  <h4 className="mt-2 text-lg font-semibold">AI brand suggestions</h4>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>2-3 logo directions</p>
                  <p>Brand colors</p>
                  <p>Shared food categories</p>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {step === 'brand' ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 2</p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Pick a calm brand direction
                </h3>
              </div>

              {showRegenerateConfirm ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-destructive/8 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
                  <span>Regenerate and replace the current suggestions?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 rounded-xl px-3"
                    onClick={() => {
                      void applyAiDraft();
                    }}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Regenerate'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-xl px-3"
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
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={disabled || generating}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
                </Button>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {brandOptions.map((option, index) => {
                const isSelected = option.id === selectedBrandOptionId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectBrandOption(option)}
                    className={cn(
                      'rounded-[28px] p-4 text-left transition ring-1 ring-inset',
                      isSelected
                        ? 'bg-foreground text-background ring-foreground/15'
                        : 'bg-muted/20 text-foreground ring-border/50 hover:bg-muted/35'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                          Option 0{index + 1}
                        </p>
                        <h4 className="mt-2 text-lg font-semibold">{option.name}</h4>
                      </div>
                      {isSelected ? <Check className="mt-1 h-5 w-5" /> : null}
                    </div>

                    <div className="mt-4 flex h-28 items-center justify-center rounded-[24px] bg-white/90 shadow-sm">
                      {option.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.logo_url}
                          alt={`${option.name} logo preview`}
                          className="h-20 w-20 object-contain"
                        />
                      ) : (
                        <span
                          className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-semibold text-white"
                          style={{ backgroundColor: option.brand_color }}
                        >
                          {company.name.slice(0, 2).toUpperCase() || 'BR'}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span
                        className="h-8 w-8 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: option.brand_color }}
                      />
                      <span
                        className="h-8 w-8 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: option.accent_color }}
                      />
                      <span className="text-xs opacity-70">
                        {option.brand_color}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 opacity-80">{option.summary}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-lg font-semibold">Shared food categories</h4>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categorySuggestions.map((category) => {
                    const isSelected = selectedCategoryKeys.includes(category.key);
                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() =>
                          setSelectedCategoryKeys((current) =>
                            current.includes(category.key)
                              ? current.filter((value) => value !== category.key)
                              : [...current, category.key]
                          )
                        }
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-medium transition ring-1 ring-inset',
                          isSelected
                            ? 'bg-foreground text-background ring-foreground/15'
                            : 'bg-background text-foreground ring-border/60 hover:bg-muted/30'
                        )}
                      >
                        {getLocalizedCategoryName(previewLanguage, category)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-4 rounded-[28px] bg-muted/35 p-5 ring-1 ring-border/50">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Selected brand
                  </p>
                  <h4 className="text-lg font-semibold">
                    {selectedBrandOption?.name ?? 'Choose a direction'}
                  </h4>
                </div>

                <div className="flex h-28 items-center justify-center rounded-[26px] bg-white ring-1 ring-black/5">
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logo_url}
                      alt="Selected brand logo"
                      className="h-20 w-20 object-contain"
                    />
                  ) : (
                    <Palette className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-color">Primary brand color</Label>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-full ring-1 ring-black/10"
                      style={{
                        backgroundColor: BRAND_COLOR_HEX_RE.test(company.brand_color)
                          ? company.brand_color
                          : 'transparent',
                      }}
                    />
                    <Input
                      id="brand-color"
                      value={company.brand_color}
                      onChange={(event) =>
                        setCompany((current) => ({
                          ...current,
                          brand_color: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className="h-11 rounded-2xl font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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

                <p className="text-sm leading-6 text-muted-foreground">
                  {selectedCategories.length} shared categories selected for the company menu
                  foundation.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={handleLogoSelected}
                  disabled={disabled}
                />
              </aside>
            </div>
          </div>
        ) : null}

        {step === 'branch' ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 3</p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Set up the starter branch
                </h3>
              </div>

              {loadingBranch ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-[28px] bg-muted/25 text-sm text-muted-foreground ring-1 ring-border/40">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading starter branch
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="branch-name">Branch name</Label>
                      <Input
                        id="branch-name"
                        value={branchSetup.branchName}
                        onChange={(event) =>
                          setBranchSetup((current) => ({
                            ...current,
                            branchName: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        className="h-12 rounded-2xl"
                        placeholder="Shibuya flagship"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="branch-code">Branch code</Label>
                      <Input
                        id="branch-code"
                        value={branchSetup.branchCode}
                        onChange={(event) =>
                          setBranchSetup((current) => ({
                            ...current,
                            branchCode: sanitizeBranchCode(event.target.value),
                          }))
                        }
                        disabled={disabled}
                        className="h-12 rounded-2xl"
                        placeholder="shibuya"
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
                        <SelectTrigger className="h-12 rounded-2xl">
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

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="branch-address">Branch address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="branch-address"
                          value={branchSetup.branchAddress}
                          onChange={(event) =>
                            setBranchSetup((current) => ({
                              ...current,
                              branchAddress: event.target.value,
                            }))
                          }
                          disabled={disabled}
                          className="h-12 rounded-2xl pl-10"
                          placeholder="2-1 Dogenzaka, Shibuya-ku, Tokyo"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="branch-phone">Branch phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="branch-phone"
                          value={branchSetup.branchPhone}
                          onChange={(event) =>
                            setBranchSetup((current) => ({
                              ...current,
                              branchPhone: event.target.value,
                            }))
                          }
                          disabled={disabled}
                          className="h-12 rounded-2xl pl-10"
                          placeholder="+81-3-0000-0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="branch-email">Branch email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="branch-email"
                          type="email"
                          value={branchSetup.branchEmail}
                          onChange={(event) =>
                            setBranchSetup((current) => ({
                              ...current,
                              branchEmail: event.target.value,
                            }))
                          }
                          disabled={disabled}
                          className="h-12 rounded-2xl pl-10"
                          placeholder="shibuya@yourcompany.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Opening hours</Label>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-muted/20 p-4 ring-1 ring-border/40">
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
                </>
              )}
            </div>

            <aside className="space-y-4 rounded-[28px] bg-muted/35 p-5 ring-1 ring-border/50">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Branch inherits
                </p>
                <h4 className="text-lg font-semibold">Company menu foundation</h4>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Branch starts from these shared categories.
              </p>

              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <span
                    key={category.key}
                    className="rounded-full bg-background px-3 py-1.5 text-sm ring-1 ring-border/60"
                  >
                    {getLocalizedCategoryName(previewLanguage, category)}
                  </span>
                ))}
              </div>

              <div className="rounded-[24px] bg-background/85 p-4 ring-1 ring-border/50">
                <p className="text-sm font-medium">Current public hours</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summarizeOpeningHours(branch.opening_hours)}
                </p>
              </div>
            </aside>
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 4</p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Review the setup before we save it
                </h3>
              </div>

              <div className="rounded-[28px] bg-muted/25 p-5 ring-1 ring-border/40">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-lg font-semibold">{company.name}</h4>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {previewCompanyDescription}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{company.address || 'No company address yet'}</p>
                  <p>{company.phone || 'No company phone yet'}</p>
                  <p>{company.email || 'No company email yet'}</p>
                  <p>{company.country} · {company.timezone} · {company.currency}</p>
                </div>
              </div>

              <div className="rounded-[28px] bg-muted/25 p-5 ring-1 ring-border/40">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-lg font-semibold">{branchSetup.branchName}</h4>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{previewHeroTitle}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {previewHeroSubtitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {previewOwnerStory}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{branchSetup.branchAddress}</p>
                  <p>{branchSetup.branchPhone || 'No branch phone yet'}</p>
                  <p>{branchSetup.branchEmail || 'No branch email yet'}</p>
                  <p>{summarizeOpeningHours(branch.opening_hours)}</p>
                </div>
              </div>
            </div>

            <aside className="space-y-4 rounded-[28px] bg-muted/35 p-5 ring-1 ring-border/50">
              <div className="flex h-28 items-center justify-center rounded-[26px] bg-white ring-1 ring-black/5">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt="Selected logo"
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 rounded-full ring-1 ring-black/10"
                  style={{
                    backgroundColor: BRAND_COLOR_HEX_RE.test(company.brand_color)
                      ? company.brand_color
                      : 'transparent',
                  }}
                />
                <div>
                  <p className="text-sm font-medium">
                    {selectedBrandOption?.name ?? 'Selected direction'}
                  </p>
                  <p className="text-sm text-muted-foreground">{company.brand_color}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Shared categories</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <span
                      key={category.key}
                      className="rounded-full bg-background px-3 py-1.5 text-sm ring-1 ring-border/60"
                    >
                      {getLocalizedCategoryName(previewLanguage, category)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] bg-background/85 p-4 ring-1 ring-border/50">
                <p className="text-sm font-medium">After setup</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <li>Add branch menu items</li>
                  <li>Invite staff</li>
                  <li>Open founder control</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="rounded-2xl"
          onClick={handleBack}
          disabled={step === 'company' || saving || generating}
        >
          Back
        </Button>

        <Button
          type="button"
          className="rounded-2xl px-5"
          onClick={() => {
            void handleNext();
          }}
          disabled={disabled || loadingBranch || generating || saving}
        >
          {generating || saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving setup' : nextButtonLabel}
        </Button>
      </div>
    </div>
  );
}
