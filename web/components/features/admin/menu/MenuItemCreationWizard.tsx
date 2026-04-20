'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PrimaryLanguage = 'en' | 'ja' | 'vi';

interface WizardCategory {
  id: string;
  name_en: string;
  name_ja?: string | null;
  name_vi?: string | null;
  source: 'organization' | 'branch';
  itemCount: number;
}

interface LocalizedFields {
  en: string;
  ja: string;
  vi: string;
}

interface OptionDraft {
  id: string;
  baseName: string;
  basePrice: string;
  sizeKey?: string;
  translations: LocalizedFields;
}

interface MenuItemCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  categories: WizardCategory[];
  ownerLanguage: PrimaryLanguage;
  locale: string;
  organizationName?: string | null;
  branchName?: string | null;
  onCreated: () => Promise<void> | void;
}

function createEmptyTranslations(): LocalizedFields {
  return { en: '', ja: '', vi: '' };
}

function localeToLanguage(locale: string): PrimaryLanguage {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith('ja')) return 'ja';
  if (normalizedLocale.startsWith('vi')) return 'vi';
  return 'en';
}

function orderedLanguages(primaryLanguage: PrimaryLanguage): PrimaryLanguage[] {
  return [primaryLanguage, ...(['en', 'ja', 'vi'] as const).filter((language) => language !== primaryLanguage)];
}

function buildLocaleCopy(locale: string) {
  const language = localeToLanguage(locale);

  if (language === 'ja') {
    return {
      title: '新しいメニュー',
      steps: ['入力', '確認', '保存'],
      primaryLanguage: '入力言語',
      category: 'カテゴリ',
      itemName: 'メニュー名',
      descriptionLabel: '短い説明',
      price: '基本価格',
      sizes: 'サイズ',
      toppings: 'トッピング',
      addSize: 'サイズを追加',
      addTopping: 'トッピングを追加',
      optionName: '名前',
      optionPrice: '追加価格',
      sizeAdjustment: '価格補正 %',
      generate: 'AIで確認',
      generating: '確認中...',
      back: '戻る',
      continue: '次へ',
      save: '保存',
      saving: '保存中...',
      reviewTitle: '言語レビュー',
      confirmTitle: '保存内容',
      companyManaged: '会社のカテゴリ',
      branchManaged: '支店カテゴリ',
      requiredMessage: 'カテゴリ、メニュー名、価格は必須です。',
      generatedMessage: 'AIが3言語の下書きを作成しました。',
      savedMessage: 'メニューを追加しました。',
      aiDescriptionPlaceholder: '例: 牛肉、米麺、香味野菜、透明感のあるスープ',
      itemPlaceholder: '例: 牛肉フォー、抹茶ラテ、揚げ春巻き',
      optionPlaceholder: '例: Lサイズ、チーズ、追加卵',
      standardSizes: 'S / M / L を追加',
      sizePreview: '適用価格',
      emptySizes: 'サイズなし',
      emptyToppings: 'トッピングなし',
      selectedLanguage: '選択言語',
      categoryItems: '登録済み',
      percentSuffix: '%',
    };
  }

  if (language === 'vi') {
    return {
      title: 'Món mới',
      steps: ['Nhập', 'Duyệt', 'Lưu'],
      primaryLanguage: 'Ngôn ngữ nhập',
      category: 'Danh mục',
      itemName: 'Tên món',
      descriptionLabel: 'Mô tả ngắn',
      price: 'Giá cơ bản',
      sizes: 'Size',
      toppings: 'Topping',
      addSize: 'Thêm size',
      addTopping: 'Thêm topping',
      optionName: 'Tên',
      optionPrice: 'Giá cộng thêm',
      sizeAdjustment: 'Điều chỉnh giá %',
      generate: 'Duyệt bằng AI',
      generating: 'Đang duyệt...',
      back: 'Quay lại',
      continue: 'Tiếp tục',
      save: 'Lưu',
      saving: 'Đang lưu...',
      reviewTitle: 'Duyệt ngôn ngữ',
      confirmTitle: 'Nội dung lưu',
      companyManaged: 'Danh mục công ty',
      branchManaged: 'Danh mục chi nhánh',
      requiredMessage: 'Danh mục, tên món và giá là bắt buộc.',
      generatedMessage: 'AI đã tạo bản nháp 3 ngôn ngữ.',
      savedMessage: 'Đã thêm món mới.',
      aiDescriptionPlaceholder: 'Ví dụ: bò thái lát, bánh phở, rau thơm, nước dùng trong',
      itemPlaceholder: 'Ví dụ: Pho bò, Matcha latte, Chả giò chiên',
      optionPlaceholder: 'Ví dụ: Cỡ lớn, phô mai, thêm trứng',
      standardSizes: 'Thêm S / M / L',
      sizePreview: 'Giá áp dụng',
      emptySizes: 'Chưa có size',
      emptyToppings: 'Chưa có topping',
      selectedLanguage: 'Ngôn ngữ chọn',
      categoryItems: 'Món hiện có',
      percentSuffix: '%',
    };
  }

  return {
    title: 'New menu item',
    steps: ['Details', 'Review', 'Save'],
    primaryLanguage: 'Primary language',
    category: 'Category',
    itemName: 'Menu item name',
    descriptionLabel: 'Short description',
    price: 'Base price',
    sizes: 'Sizes',
    toppings: 'Toppings',
    addSize: 'Add size',
    addTopping: 'Add topping',
    optionName: 'Name',
    optionPrice: 'Extra price',
    sizeAdjustment: 'Price adjustment %',
    generate: 'Review with AI',
    generating: 'Reviewing...',
    back: 'Back',
    continue: 'Next',
    save: 'Save',
    saving: 'Saving...',
    reviewTitle: 'Language review',
    confirmTitle: 'Save summary',
    companyManaged: 'Company category',
    branchManaged: 'Branch category',
    requiredMessage: 'Category, item name, and price are required.',
    generatedMessage: 'AI drafted the multilingual menu copy.',
    savedMessage: 'Menu item added.',
    aiDescriptionPlaceholder: 'Example: sliced beef, rice noodles, herbs, clear broth',
    itemPlaceholder: 'Example: Pho beef bowl, Matcha latte, Crispy spring rolls',
    optionPlaceholder: 'Example: Large size, Cheese, Extra egg',
    standardSizes: 'Add S / M / L',
    sizePreview: 'Applied price',
    emptySizes: 'No size options',
    emptyToppings: 'No toppings',
    selectedLanguage: 'Selected language',
    categoryItems: 'Current items',
    percentSuffix: '%',
  };
}

async function translateText(
  text: string,
  context: 'item' | 'topping'
): Promise<LocalizedFields> {
  const response = await fetch('/api/v1/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, field: 'name', context }),
  });

  if (!response.ok) {
    throw new Error('Failed to translate menu copy');
  }

  const data = (await response.json()) as { en: string; ja: string; vi: string };
  return {
    en: data.en ?? '',
    ja: data.ja ?? '',
    vi: data.vi ?? '',
  };
}

function languageLabel(language: PrimaryLanguage) {
  if (language === 'ja') return '日本語';
  if (language === 'vi') return 'Tiếng Việt';
  return 'English';
}

function currencyValue(rawValue: string) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function adjustmentValue(rawValue: string) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolvedSizePrice(basePrice: string, adjustment: string) {
  const base = currencyValue(basePrice);
  return Math.round(base * (1 + adjustmentValue(adjustment) / 100));
}

function localizedCategoryName(
  category: Pick<WizardCategory, 'name_en' | 'name_ja' | 'name_vi'>,
  locale: string
) {
  const language = localeToLanguage(locale);

  if (language === 'vi') return category.name_vi || category.name_en || category.name_ja || '';
  if (language === 'ja') return category.name_ja || category.name_en || category.name_vi || '';
  return category.name_en || category.name_ja || category.name_vi || '';
}

function primaryLanguageValue(values: LocalizedFields, language: PrimaryLanguage, fallback = '') {
  return values[language].trim() || fallback;
}

function secondaryLanguageValues(values: LocalizedFields, primaryLanguage: PrimaryLanguage) {
  const seen = new Set<string>();
  const primaryValue = values[primaryLanguage].trim();

  if (primaryValue) {
    seen.add(primaryValue.toLocaleLowerCase());
  }

  return orderedLanguages(primaryLanguage)
    .slice(1)
    .map((language) => values[language].trim())
    .filter((value) => {
      if (!value) return false;

      const normalizedValue = value.toLocaleLowerCase();
      if (seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    });
}

export function MenuItemCreationWizard({
  open,
  onOpenChange,
  branchId,
  categories,
  ownerLanguage,
  locale,
  organizationName,
  branchName,
  onCreated,
}: MenuItemCreationWizardProps) {
  const copy = useMemo(() => buildLocaleCopy(locale), [locale]);
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? '',
    primaryLanguage: ownerLanguage,
    primaryName: '',
    primaryDescription: '',
    basePrice: '',
    sizes: [] as OptionDraft[],
    toppings: [] as OptionDraft[],
    reviewNames: createEmptyTranslations(),
    reviewDescriptions: createEmptyTranslations(),
  });

  const selectedCategory = categories.find((category) => category.id === form.categoryId);

  const reset = () => {
    setStep(0);
    setIsGenerating(false);
    setIsSaving(false);
    setForm({
      categoryId: categories[0]?.id ?? '',
      primaryLanguage: ownerLanguage,
      primaryName: '',
      primaryDescription: '',
      basePrice: '',
      sizes: [],
      toppings: [],
      reviewNames: createEmptyTranslations(),
      reviewDescriptions: createEmptyTranslations(),
    });
  };

  const addStandardSizes = () => {
    setForm((current) => ({
      ...current,
      sizes: [
        {
          id: crypto.randomUUID(),
          baseName: 'Small',
          basePrice: '-25',
          sizeKey: 'S',
          translations: createEmptyTranslations(),
        },
        {
          id: crypto.randomUUID(),
          baseName: 'Medium',
          basePrice: '0',
          sizeKey: 'M',
          translations: createEmptyTranslations(),
        },
        {
          id: crypto.randomUUID(),
          baseName: 'Large',
          basePrice: '25',
          sizeKey: 'L',
          translations: createEmptyTranslations(),
        },
      ],
    }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const addOption = (type: 'sizes' | 'toppings') => {
    const nextOption: OptionDraft = {
      id: crypto.randomUUID(),
      baseName: '',
      basePrice: '',
      sizeKey: type === 'sizes' ? '' : undefined,
      translations: createEmptyTranslations(),
    };

    setForm((current) => ({
      ...current,
      [type]: [...current[type], nextOption],
    }));
  };

  const updateOption = (
    type: 'sizes' | 'toppings',
    optionId: string,
    patch: Partial<OptionDraft>
  ) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].map((option) =>
        option.id === optionId ? { ...option, ...patch } : option
      ),
    }));
  };

  const removeOption = (type: 'sizes' | 'toppings', optionId: string) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].filter((option) => option.id !== optionId),
    }));
  };

  const applyPrimaryLanguage = (translations: LocalizedFields, fallback: string) => {
    const nextTranslations = { ...translations };
    nextTranslations[form.primaryLanguage] = fallback;
    return nextTranslations;
  };

  const handleGenerateReview = async () => {
    if (!form.categoryId || !form.primaryName.trim() || form.basePrice.trim() === '') {
      toast.error(copy.requiredMessage);
      return;
    }

    setIsGenerating(true);

    try {
      const aiResponse = await fetch('/api/v1/ai/generate-menu-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.primaryName.trim(),
          existingDescription: form.primaryDescription.trim(),
          language: form.primaryLanguage,
          restaurantName: branchName ?? organizationName ?? 'Restaurant menu',
          restaurantDescription:
            organizationName && branchName
              ? `Create short branch-ready menu copy for ${branchName} under ${organizationName}.`
              : 'Create short branch-ready menu copy for restaurant operators.',
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to generate AI menu copy');
      }

      const aiDraft = (await aiResponse.json()) as {
        name_en: string;
        name_ja: string;
        name_vi: string;
        description_en: string;
        description_ja: string;
        description_vi: string;
      };

      const [sizeTranslations, toppingTranslations] = await Promise.all([
        Promise.all(
          form.sizes.map(async (size) => ({
            id: size.id,
            translations: applyPrimaryLanguage(
              await translateText(size.baseName || 'Size option', 'item'),
              size.baseName
            ),
          }))
        ),
        Promise.all(
          form.toppings.map(async (topping) => ({
            id: topping.id,
            translations: applyPrimaryLanguage(
              await translateText(topping.baseName || 'Topping', 'topping'),
              topping.baseName
            ),
          }))
        ),
      ]);

      setForm((current) => ({
        ...current,
        reviewNames: {
          en: current.primaryLanguage === 'en' ? current.primaryName.trim() : aiDraft.name_en,
          ja: current.primaryLanguage === 'ja' ? current.primaryName.trim() : aiDraft.name_ja,
          vi: current.primaryLanguage === 'vi' ? current.primaryName.trim() : aiDraft.name_vi,
        },
        reviewDescriptions: {
          en:
            current.primaryLanguage === 'en'
              ? current.primaryDescription.trim() || aiDraft.description_en || ''
              : aiDraft.description_en ?? '',
          ja:
            current.primaryLanguage === 'ja'
              ? current.primaryDescription.trim() || aiDraft.description_ja || ''
              : aiDraft.description_ja ?? '',
          vi:
            current.primaryLanguage === 'vi'
              ? current.primaryDescription.trim() || aiDraft.description_vi || ''
              : aiDraft.description_vi ?? '',
        },
        sizes: current.sizes.map((size) => {
          const match = sizeTranslations.find((entry) => entry.id === size.id);
          return match ? { ...size, translations: match.translations } : size;
        }),
        toppings: current.toppings.map((topping) => {
          const match = toppingTranslations.find((entry) => entry.id === topping.id);
          return match ? { ...topping, translations: match.translations } : topping;
        }),
      }));

      setStep(1);
      toast.success(copy.generatedMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/owner/menu/menu-items?branchId=${encodeURIComponent(branchId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: form.categoryId,
          name_en: form.reviewNames.en,
          name_ja: form.reviewNames.ja,
          name_vi: form.reviewNames.vi,
          description_en: form.reviewDescriptions.en,
          description_ja: form.reviewDescriptions.ja,
          description_vi: form.reviewDescriptions.vi,
          price: currencyValue(form.basePrice),
          available: true,
          weekday_visibility: [1, 2, 3, 4, 5, 6, 7],
          position: selectedCategory?.itemCount ?? 0,
          sizes: form.sizes
            .filter((size) => size.baseName.trim().length > 0)
            .map((size, index) => ({
              size_key: size.sizeKey?.trim() || `size-${index + 1}`,
              name_en: size.translations.en || size.baseName,
              name_ja: size.translations.ja || size.baseName,
              name_vi: size.translations.vi || size.baseName,
              price: resolvedSizePrice(form.basePrice, size.basePrice),
              position: index,
            })),
          toppings: form.toppings
            .filter((topping) => topping.baseName.trim().length > 0)
            .map((topping, index) => ({
              name_en: topping.translations.en || topping.baseName,
              name_ja: topping.translations.ja || topping.baseName,
              name_vi: topping.translations.vi || topping.baseName,
              price: currencyValue(topping.basePrice),
              position: index,
            })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? 'Failed to save menu item');
      }

      toast.success(copy.savedMessage);
      await onCreated();
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save menu item');
    } finally {
      setIsSaving(false);
    }
  };

  const renderOptionEditor = (type: 'sizes' | 'toppings', options: OptionDraft[]) => (
    <div className="space-y-3">
      {options.map((option) => (
        <div
          key={option.id}
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <div className="space-y-2">
              {type === 'sizes' ? (
                <Input
                  value={option.sizeKey ?? ''}
                  onChange={(event) =>
                    updateOption(type, option.id, { sizeKey: event.target.value })
                  }
                  placeholder="S / M / L"
                  className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              ) : null}
              <Input
                value={option.baseName}
                onChange={(event) =>
                  updateOption(type, option.id, { baseName: event.target.value })
                }
                placeholder={copy.optionPlaceholder}
                className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <Input
              value={option.basePrice}
              onChange={(event) =>
                updateOption(type, option.id, { basePrice: event.target.value })
              }
              placeholder={type === 'sizes' ? copy.sizeAdjustment : copy.optionPrice}
              inputMode="decimal"
              className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
              onClick={() => removeOption(type, option.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {type === 'sizes' ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {copy.sizePreview}: {resolvedSizePrice(form.basePrice, option.basePrice)} (
              {adjustmentValue(option.basePrice)}
              {copy.percentSuffix})
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );

  const renderLocalizedReview = (
    label: string,
    values: LocalizedFields,
    onChange: (patch: Partial<LocalizedFields>) => void,
    multiline = false
  ) => (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center gap-2">
        <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {orderedLanguages(form.primaryLanguage).map((language) => {
          const FieldComponent = multiline ? Textarea : Input;
          return (
            <div key={language} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {languageLabel(language)}
                </p>
                {language === form.primaryLanguage ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {copy.selectedLanguage}
                  </Badge>
                ) : null}
              </div>
              <FieldComponent
                value={values[language]}
                onChange={(event) => onChange({ [language]: event.target.value })}
                rows={multiline ? 3 : undefined}
                className={cn(
                  'rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
                  !multiline && 'h-10'
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] border border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {copy.steps.map((stepLabel, index) => (
              <Badge
                key={stepLabel}
                variant="secondary"
                className={cn(
                  'rounded-full px-3 py-1 text-xs',
                  index === step
                    ? 'bg-slate-900 text-white hover:bg-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                )}
              >
                {index + 1}. {stepLabel}
              </Badge>
            ))}
          </div>
          <DialogTitle className="mt-4 text-2xl font-semibold text-slate-950 dark:text-slate-100">
            {copy.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          {step === 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_0.8fr]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{copy.category}</p>
                  <Select
                    value={form.categoryId}
                    onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectValue placeholder={copy.category} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {localizedCategoryName(category, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{copy.primaryLanguage}</p>
                  <Select
                    value={form.primaryLanguage}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        primaryLanguage: value as PrimaryLanguage,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{copy.price}</p>
                  <Input
                    value={form.basePrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, basePrice: event.target.value }))
                    }
                    placeholder="0"
                    inputMode="decimal"
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{copy.itemName}</p>
                  <Input
                    value={form.primaryName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, primaryName: event.target.value }))
                    }
                    placeholder={copy.itemPlaceholder}
                    className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedCategory?.source === 'organization'
                          ? copy.companyManaged
                          : copy.branchManaged}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {selectedCategory
                          ? `${copy.categoryItems}: ${selectedCategory.itemCount}`
                          : copy.category}
                      </p>
                    </div>
                    <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100">
                      {selectedCategory?.source === 'organization' ? 'ORG' : 'LOCAL'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{copy.descriptionLabel}</p>
                <Textarea
                  value={form.primaryDescription}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      primaryDescription: event.target.value,
                    }))
                  }
                  placeholder={copy.aiDescriptionPlaceholder}
                  rows={4}
                  className="rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.sizes}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                        onClick={addStandardSizes}
                      >
                        {copy.standardSizes}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                        onClick={() => addOption('sizes')}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {copy.addSize}
                      </Button>
                    </div>
                  </div>
                  {renderOptionEditor('sizes', form.sizes)}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.toppings}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                      onClick={() => addOption('toppings')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.addTopping}
                    </Button>
                  </div>
                  {renderOptionEditor('toppings', form.toppings)}
                </div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              {renderLocalizedReview(copy.itemName, form.reviewNames, (patch) =>
                setForm((current) => ({
                  ...current,
                  reviewNames: { ...current.reviewNames, ...patch },
                }))
              )}

              {renderLocalizedReview(copy.descriptionLabel, form.reviewDescriptions, (patch) =>
                setForm((current) => ({
                  ...current,
                  reviewDescriptions: { ...current.reviewDescriptions, ...patch },
                }))
              , true)}

              {form.sizes.length > 0 ? (
                <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{copy.sizes}</p>
                  <div className="space-y-4">
                    {form.sizes.map((size) => (
                      <div key={size.id} className="rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-900/70">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {size.sizeKey ? (
                            <Badge variant="secondary" className="rounded-full">
                              {size.sizeKey}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="rounded-full">
                            {resolvedSizePrice(form.basePrice, size.basePrice)}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {adjustmentValue(size.basePrice)}
                            {copy.percentSuffix}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {orderedLanguages(form.primaryLanguage).map((language) => (
                            <Input
                              key={language}
                              value={size.translations[language]}
                              onChange={(event) =>
                                updateOption('sizes', size.id, {
                                  translations: {
                                    ...size.translations,
                                    [language]: event.target.value,
                                  },
                                })
                              }
                              className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {form.toppings.length > 0 ? (
                <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{copy.toppings}</p>
                  <div className="space-y-4">
                    {form.toppings.map((topping) => (
                      <div key={topping.id} className="rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-900/70">
                        <div className="mb-3">
                          <Badge variant="secondary" className="rounded-full">
                            +{currencyValue(topping.basePrice)}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {orderedLanguages(form.primaryLanguage).map((language) => (
                            <Input
                              key={language}
                              value={topping.translations[language]}
                              onChange={(event) =>
                                updateOption('toppings', topping.id, {
                                  translations: {
                                    ...topping.translations,
                                    [language]: event.target.value,
                                  },
                                })
                              }
                              className="h-10 rounded-xl border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100">
                    {selectedCategory ? localizedCategoryName(selectedCategory, locale) : copy.category}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {languageLabel(form.primaryLanguage)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {currencyValue(form.basePrice)}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {copy.reviewTitle}
                    </p>
                    <div className="mt-3 space-y-3">
                      {orderedLanguages(form.primaryLanguage).map((language) => (
                        <div key={language} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {languageLabel(language)}
                            </p>
                            {language === form.primaryLanguage ? (
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                {copy.selectedLanguage}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-100">
                            {form.reviewNames[language] || '-'}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            {form.reviewDescriptions[language] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.sizes}</p>
                      <div className="mt-3 space-y-2">
                        {form.sizes.length > 0 ? (
                          form.sizes.map((size) => (
                            <div
                              key={size.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                          >
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {primaryLanguageValue(size.translations, form.primaryLanguage, size.baseName)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {secondaryLanguageValues(size.translations, form.primaryLanguage).join(' • ') || size.baseName}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {resolvedSizePrice(form.basePrice, size.basePrice)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {adjustmentValue(size.basePrice)}
                                  {copy.percentSuffix}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.emptySizes}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.toppings}</p>
                      <div className="mt-3 space-y-2">
                        {form.toppings.length > 0 ? (
                          form.toppings.map((topping) => (
                            <div
                              key={topping.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                          >
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {primaryLanguageValue(
                                    topping.translations,
                                    form.primaryLanguage,
                                    topping.baseName
                                  )}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {secondaryLanguageValues(topping.translations, form.primaryLanguage).join(' • ') || topping.baseName}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                +{currencyValue(topping.basePrice)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.emptyToppings}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Check className="h-4 w-4" />
            {copy.steps[step]}
          </div>
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => setStep((current) => current - 1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {copy.back}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => handleOpenChange(false)}
              >
                {copy.back}
              </Button>
            )}

            {step === 0 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={handleGenerateReview}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <WandSparkles className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? copy.generating : copy.generate}
              </Button>
            ) : null}

            {step === 1 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={() => setStep(2)}
              >
                {copy.continue}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}

            {step === 2 ? (
              <Button
                type="button"
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isSaving ? copy.saving : copy.save}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
