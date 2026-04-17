'use client';

import { useMemo, useState } from 'react';
import {
  Layers3,
  Plus,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { OrganizationSharedMenuCategory } from '@/lib/server/organizations/shared-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface ControlSharedMenuPanelProps {
  categories: OrganizationSharedMenuCategory[];
  organizationName?: string;
}

type PrimaryLanguage = 'en' | 'ja' | 'vi';

const SAMPLE_CATEGORIES = [
  { key: 'starters', name_en: 'Starters', name_ja: '前菜', name_vi: 'Món khai vị' },
  { key: 'mains', name_en: 'Main dishes', name_ja: 'メイン', name_vi: 'Món chính' },
  { key: 'desserts', name_en: 'Desserts', name_ja: 'デザート', name_vi: 'Món tráng miệng' },
  { key: 'drinks', name_en: 'Drinks', name_ja: 'ドリンク', name_vi: 'Đồ uống' },
  { key: 'specials', name_en: 'Chef specials', name_ja: 'おすすめ', name_vi: 'Món đặc biệt' },
  { key: 'kids', name_en: 'Kids menu', name_ja: 'キッズメニュー', name_vi: 'Thực đơn trẻ em' },
] as const;

function formatPrice(price: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(price);
}

async function translateCategoryName(text: string) {
  const response = await fetch('/api/v1/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      field: 'name',
      context: 'category',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to translate category');
  }

  return response.json() as Promise<{ en: string; ja: string; vi: string }>;
}

async function generateSharedMenuItemAI(params: {
  itemName: string;
  primaryLanguage: PrimaryLanguage;
  notes?: string;
  categoryName?: string;
  organizationName?: string;
}) {
  const { itemName, primaryLanguage, notes, categoryName, organizationName } = params;
  const response = await fetch('/api/v1/ai/generate-menu-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemName,
      existingDescription: [notes, categoryName ? `Category: ${categoryName}` : '']
        .filter(Boolean)
        .join('\n'),
      language: primaryLanguage,
      restaurantName: organizationName ?? 'Restaurant group menu template',
      restaurantDescription: categoryName
        ? `Create reusable shared menu content for the ${categoryName} category.`
        : 'Create reusable shared menu content for multiple restaurant branches.',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI content');
  }

  return response.json() as Promise<{
    name_en: string;
    name_ja: string;
    name_vi: string;
    description_en: string;
    description_ja: string;
    description_vi: string;
  }>;
}

export function ControlSharedMenuPanel({
  categories,
  organizationName,
}: ControlSharedMenuPanelProps) {
  const router = useRouter();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingSamples, setCreatingSamples] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    primaryName: '',
    primaryLanguage: 'en' as PrimaryLanguage,
    name_en: '',
    name_ja: '',
    name_vi: '',
  });
  const [itemForm, setItemForm] = useState({
    category_id: categories[0]?.id ?? '',
    primaryName: '',
    primaryLanguage: 'en' as PrimaryLanguage,
    price: '',
    notes: '',
    name_en: '',
    name_ja: '',
    name_vi: '',
    description_en: '',
    description_ja: '',
    description_vi: '',
  });

  const hasCategories = categories.length > 0;
  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );
  const existingCategoryNames = useMemo(
    () =>
      new Set(
        categories.flatMap((category) =>
          [category.name_en, category.name_ja, category.name_vi]
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .map((value) => value.trim().toLowerCase())
        )
      ),
    [categories]
  );

  const refresh = () => router.refresh();

  const resetCategoryForm = () => {
    setCategoryForm({
      primaryName: '',
      primaryLanguage: 'en',
      name_en: '',
      name_ja: '',
      name_vi: '',
    });
  };

  const resetItemForm = () => {
    setItemForm({
      category_id: categories[0]?.id ?? '',
      primaryName: '',
      primaryLanguage: 'en',
      price: '',
      notes: '',
      name_en: '',
      name_ja: '',
      name_vi: '',
      description_en: '',
      description_ja: '',
      description_vi: '',
    });
  };

  const handleCreateCategory = async (payload?: {
    name_en: string;
    name_ja?: string;
    name_vi?: string;
  }) => {
    const nameEn = payload?.name_en ?? categoryForm.name_en ?? '';
    const trimmedPrimaryName = categoryForm.primaryName.trim();

    if (!payload && !trimmedPrimaryName && !nameEn.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      let translatedNames = {
        name_en: payload?.name_en ?? categoryForm.name_en.trim(),
        name_ja: payload?.name_ja ?? categoryForm.name_ja.trim(),
        name_vi: payload?.name_vi ?? categoryForm.name_vi.trim(),
      };

      if (!payload) {
        if (!translatedNames.name_en || !translatedNames.name_ja || !translatedNames.name_vi) {
          const translations = await translateCategoryName(trimmedPrimaryName || translatedNames.name_en);
          translatedNames = {
            name_en: translatedNames.name_en || translations.en,
            name_ja: translatedNames.name_ja || translations.ja,
            name_vi: translatedNames.name_vi || translations.vi,
          };
        }

        if (categoryForm.primaryLanguage === 'en') {
          translatedNames.name_en = trimmedPrimaryName || translatedNames.name_en;
        } else if (categoryForm.primaryLanguage === 'ja') {
          translatedNames.name_ja = trimmedPrimaryName || translatedNames.name_ja;
        } else {
          translatedNames.name_vi = trimmedPrimaryName || translatedNames.name_vi;
        }
      }

      const response = await fetch('/api/v1/owner/organization/shared-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          ...translatedNames,
          position: categories.length,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create category');
      }

      if (!payload) {
        toast.success('Shared category added');
        setIsCategoryDialogOpen(false);
        resetCategoryForm();
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateSampleCategories = async () => {
    const missingSamples = SAMPLE_CATEGORIES.filter(
      (sample) =>
        ![sample.name_en, sample.name_ja, sample.name_vi].some((value) =>
          existingCategoryNames.has(value.trim().toLowerCase())
        )
    );

    if (missingSamples.length === 0) {
      toast.success('Sample categories are already ready');
      return;
    }

    setCreatingSamples(true);
    try {
      for (const [index, sample] of missingSamples.entries()) {
        // Keep order stable by appending sequentially.
        // We refresh after the batch to avoid multiple router refreshes.
        const response = await fetch('/api/v1/owner/organization/shared-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'category',
            name_en: sample.name_en,
            name_ja: sample.name_ja,
            name_vi: sample.name_vi,
            position: categories.length + index,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to add ${sample.name_en}`);
        }
      }
      toast.success('Sample customer categories added');
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add sample categories');
    } finally {
      setCreatingSamples(false);
    }
  };

  const handleGenerateItemAI = async () => {
    if (!itemForm.primaryName.trim()) {
      toast.error('Start with the dish name first');
      return;
    }

    setGeneratingAI(true);
    try {
      const currentCategory = categories.find((category) => category.id === itemForm.category_id);
      const result = await generateSharedMenuItemAI({
        itemName: itemForm.primaryName.trim(),
        primaryLanguage: itemForm.primaryLanguage,
        notes: itemForm.notes.trim(),
        categoryName: currentCategory?.name_en,
        organizationName,
      });

      setItemForm((current) => ({
        ...current,
        name_en: result.name_en || current.name_en,
        name_ja: result.name_ja || current.name_ja,
        name_vi: result.name_vi || current.name_vi,
        description_en: result.description_en || current.description_en,
        description_ja: result.description_ja || current.description_ja,
        description_vi: result.description_vi || current.description_vi,
      }));
      toast.success('AI filled translations and descriptions');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI content');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateItem = async () => {
    if (!itemForm.category_id) {
      toast.error('Choose a category first');
      return;
    }
    if (!itemForm.primaryName.trim()) {
      toast.error('Dish name is required');
      return;
    }

    const price = Number(itemForm.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }

    const currentCategory = categories.find((category) => category.id === itemForm.category_id);
    const nameFields = {
      name_en: itemForm.name_en.trim(),
      name_ja: itemForm.name_ja.trim(),
      name_vi: itemForm.name_vi.trim(),
    };
    const descriptionFields = {
      description_en: itemForm.description_en.trim(),
      description_ja: itemForm.description_ja.trim(),
      description_vi: itemForm.description_vi.trim(),
    };

    if (itemForm.primaryLanguage === 'en') {
      nameFields.name_en = itemForm.primaryName.trim() || nameFields.name_en;
    } else if (itemForm.primaryLanguage === 'ja') {
      nameFields.name_ja = itemForm.primaryName.trim() || nameFields.name_ja;
    } else {
      nameFields.name_vi = itemForm.primaryName.trim() || nameFields.name_vi;
    }

    setCreatingItem(true);
    try {
      const response = await fetch('/api/v1/owner/organization/shared-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          category_id: itemForm.category_id,
          ...nameFields,
          ...descriptionFields,
          price,
          available: true,
          position: currentCategory?.items.length ?? 0,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create shared item');
      }

      toast.success('Shared item added');
      setIsItemDialogOpen(false);
      resetItemForm();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create shared item');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Delete this category and its shared items?')) {
      return;
    }

    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/categories/${categoryId}`,
      { method: 'DELETE' }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? 'Failed to delete category');
      return;
    }

    toast.success('Category removed');
    refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/items/${itemId}`,
      { method: 'DELETE' }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? 'Failed to delete item');
      return;
    }

    toast.success('Item removed');
    refresh();
  };

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
            <Layers3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Shared menu starter</h2>
              <Badge variant="secondary" className="rounded-full">
                {categories.length} categories
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {totalItems} items
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create reusable categories and dishes here, then copy them to each branch menu when needed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setIsCategoryDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Category
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            onClick={() => setIsItemDialogOpen(true)}
            disabled={!hasCategories}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Add shared item
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-[28px] border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Sample customer categories</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                One tap gives founders a clean starter structure for QR customers.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={creatingSamples}
              onClick={handleCreateSampleCategories}
            >
              {creatingSamples ? 'Adding...' : 'Add starter pack'}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLE_CATEGORIES.map((sample) => {
              const exists = [sample.name_en, sample.name_ja, sample.name_vi].some((value) =>
                existingCategoryNames.has(value.trim().toLowerCase())
              );

              return (
                <button
                  key={sample.key}
                  type="button"
                  disabled={exists || creatingSamples || creatingCategory}
                  onClick={() =>
                    handleCreateCategory({
                      name_en: sample.name_en,
                      name_ja: sample.name_ja,
                      name_vi: sample.name_vi,
                    })
                  }
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sample.name_en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Owner-friendly AI flow</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the dish name once, let AI draft the three languages, then copy to branches.
              </p>
            </div>
            <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
              AI ready
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                1. Choose category
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Use the sample pack for starters, mains, desserts, and drinks.
              </p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                2. Name the dish
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Type it in your main language, then let AI fill the other languages.
              </p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                3. Reuse everywhere
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Shared items stay as templates until each branch copies what it needs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasCategories ? (
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-[28px] border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {category.name_ja || category.name_en}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[category.name_en, category.name_vi].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {category.items.length}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {category.items.length > 0 ? (
                  category.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.name_ja || item.name_en}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[item.name_en, item.name_vi].filter(Boolean).join(' • ')}
                        </p>
                        {(item.description_ja || item.description_en || item.description_vi) ? (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {item.description_ja || item.description_en || item.description_vi}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatPrice(item.price)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-muted-foreground">
                    No items yet. Add one reusable dish for this category.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Start with the sample pack, then add your first shared dish with AI.
        </div>
      )}

      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) {
            resetCategoryForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Add shared category</DialogTitle>
            <DialogDescription>
              Founders usually only need the category name. We can fill the other languages automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="mb-2 text-sm font-medium">Primary language</p>
                <Select
                  value={categoryForm.primaryLanguage}
                  onValueChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      primaryLanguage: value as PrimaryLanguage,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Category name</p>
                <Input
                  value={categoryForm.primaryName}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      primaryName: event.target.value,
                    }))
                  }
                  placeholder="Starter, Main dishes, Drinks..."
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={categoryForm.name_en}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name_en: event.target.value }))
                }
                placeholder="English"
                className="h-11 rounded-2xl"
              />
              <Input
                value={categoryForm.name_ja}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name_ja: event.target.value }))
                }
                placeholder="日本語"
                className="h-11 rounded-2xl"
              />
              <Input
                value={categoryForm.name_vi}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name_vi: event.target.value }))
                }
                placeholder="Tiếng Việt"
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              If you only type one language, AI translation fills the rest on save.
            </p>
            <Button
              type="button"
              onClick={() => handleCreateCategory()}
              disabled={creatingCategory}
              className="rounded-xl gap-2"
            >
              {creatingCategory && <Sparkles className="h-4 w-4 animate-pulse" />}
              Save category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isItemDialogOpen}
        onOpenChange={(open) => {
          setIsItemDialogOpen(open);
          if (!open) {
            resetItemForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Add shared menu item</DialogTitle>
            <DialogDescription>
              This follows the branch menu idea: type the main dish once, let AI generate multilingual copy, then save the reusable template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr_0.8fr]">
              <div>
                <p className="mb-2 text-sm font-medium">Category</p>
                <Select
                  value={itemForm.category_id}
                  onValueChange={(value) =>
                    setItemForm((current) => ({
                      ...current,
                      category_id: value,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_ja || category.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Primary language</p>
                <Select
                  value={itemForm.primaryLanguage}
                  onValueChange={(value) =>
                    setItemForm((current) => ({
                      ...current,
                      primaryLanguage: value as PrimaryLanguage,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Price</p>
                <Input
                  value={itemForm.price}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="0"
                  inputMode="decimal"
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.3fr_0.9fr]">
              <div>
                <p className="mb-2 text-sm font-medium">Dish name</p>
                <Input
                  value={itemForm.primaryName}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      primaryName: event.target.value,
                    }))
                  }
                  placeholder="Pho beef bowl, Matcha latte, Fresh spring rolls..."
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl gap-2"
                  onClick={handleGenerateItemAI}
                  disabled={generatingAI || !itemForm.primaryName.trim()}
                >
                  {generatingAI ? (
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                  AI fill
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Notes for AI</p>
              <Textarea
                value={itemForm.notes}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional: signature dish, spicy, vegetarian, lunch favorite..."
                rows={2}
                className="rounded-2xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={itemForm.name_en}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, name_en: event.target.value }))
                }
                placeholder="English name"
                className="h-11 rounded-2xl"
              />
              <Input
                value={itemForm.name_ja}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, name_ja: event.target.value }))
                }
                placeholder="日本語名"
                className="h-11 rounded-2xl"
              />
              <Input
                value={itemForm.name_vi}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, name_vi: event.target.value }))
                }
                placeholder="Tên tiếng Việt"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Textarea
                value={itemForm.description_en}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    description_en: event.target.value,
                  }))
                }
                placeholder="English description"
                rows={3}
                className="rounded-2xl"
              />
              <Textarea
                value={itemForm.description_ja}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    description_ja: event.target.value,
                  }))
                }
                placeholder="日本語の説明"
                rows={3}
                className="rounded-2xl"
              />
              <Textarea
                value={itemForm.description_vi}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    description_vi: event.target.value,
                  }))
                }
                placeholder="Mô tả tiếng Việt"
                rows={3}
                className="rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              AI is optional. You can still edit every language before saving.
            </p>
            <Button
              type="button"
              onClick={handleCreateItem}
              disabled={creatingItem}
              className="rounded-xl gap-2"
            >
              {creatingItem && <Sparkles className="h-4 w-4 animate-pulse" />}
              Save shared item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
