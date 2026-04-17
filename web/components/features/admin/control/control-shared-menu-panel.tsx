'use client';

import { useMemo, useState } from 'react';
import { Layers3, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type {
  OrganizationSharedMenuCategory,
} from '@/lib/server/organizations/shared-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ControlSharedMenuPanelProps {
  categories: OrganizationSharedMenuCategory[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ControlSharedMenuPanel({
  categories,
}: ControlSharedMenuPanelProps) {
  const router = useRouter();
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name_en: '',
    name_ja: '',
    name_vi: '',
  });
  const [itemForm, setItemForm] = useState({
    category_id: categories[0]?.id ?? '',
    name_en: '',
    name_ja: '',
    name_vi: '',
    description_en: '',
    description_ja: '',
    description_vi: '',
    price: '',
  });

  const hasCategories = categories.length > 0;
  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories]
  );

  const refresh = () => router.refresh();

  const handleCreateCategory = async () => {
    if (!categoryForm.name_en.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await fetch('/api/v1/owner/organization/shared-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          ...categoryForm,
          position: categories.length,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to create category');
        return;
      }
      setCategoryForm({ name_en: '', name_ja: '', name_vi: '' });
      toast.success('Category added');
      refresh();
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateItem = async () => {
    if (!itemForm.category_id) {
      toast.error('Choose a category first');
      return;
    }
    if (!itemForm.name_en.trim()) {
      toast.error('Item name is required');
      return;
    }

    const price = Number(itemForm.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }

    setCreatingItem(true);
    try {
      const targetCategory = categories.find((category) => category.id === itemForm.category_id);
      const response = await fetch('/api/v1/owner/organization/shared-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          ...itemForm,
          price,
          available: true,
          position: targetCategory?.items.length ?? 0,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error ?? 'Failed to create item');
        return;
      }
      setItemForm((current) => ({
        ...current,
        name_en: '',
        name_ja: '',
        name_vi: '',
        description_en: '',
        description_ja: '',
        description_vi: '',
        price: '',
      }));
      toast.success('Shared item added');
      refresh();
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
            <Layers3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Shared menu</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full">
                {categories.length} categories
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {totalItems} items
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={handleCreateCategory}
            disabled={creatingCategory}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Category
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            onClick={handleCreateItem}
            disabled={creatingItem || !hasCategories}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Item
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
          <Input
            value={categoryForm.name_en}
            onChange={(event) => setCategoryForm((current) => ({ ...current, name_en: event.target.value }))}
            placeholder="Category name"
            className="h-11 rounded-xl bg-background"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={categoryForm.name_ja}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name_ja: event.target.value }))}
              placeholder="日本語"
              className="h-11 rounded-xl bg-background"
            />
            <Input
              value={categoryForm.name_vi}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name_vi: event.target.value }))}
              placeholder="Tiếng Việt"
              className="h-11 rounded-xl bg-background"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]">
            <select
              value={itemForm.category_id}
              onChange={(event) => setItemForm((current) => ({ ...current, category_id: event.target.value }))}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ja || category.name_en}
                </option>
              ))}
            </select>
            <Input
              value={itemForm.price}
              onChange={(event) => setItemForm((current) => ({ ...current, price: event.target.value }))}
              placeholder="Price"
              inputMode="decimal"
              className="h-11 rounded-xl bg-background"
            />
          </div>
          <Input
            value={itemForm.name_en}
            onChange={(event) => setItemForm((current) => ({ ...current, name_en: event.target.value }))}
            placeholder="Item name"
            className="h-11 rounded-xl bg-background"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={itemForm.name_ja}
              onChange={(event) => setItemForm((current) => ({ ...current, name_ja: event.target.value }))}
              placeholder="日本語"
              className="h-11 rounded-xl bg-background"
            />
            <Input
              value={itemForm.name_vi}
              onChange={(event) => setItemForm((current) => ({ ...current, name_vi: event.target.value }))}
              placeholder="Tiếng Việt"
              className="h-11 rounded-xl bg-background"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Textarea
              value={itemForm.description_en}
              onChange={(event) => setItemForm((current) => ({ ...current, description_en: event.target.value }))}
              placeholder="Description"
              rows={2}
              className="rounded-xl bg-background"
            />
            <Textarea
              value={itemForm.description_ja}
              onChange={(event) => setItemForm((current) => ({ ...current, description_ja: event.target.value }))}
              placeholder="説明"
              rows={2}
              className="rounded-xl bg-background"
            />
            <Textarea
              value={itemForm.description_vi}
              onChange={(event) => setItemForm((current) => ({ ...current, description_vi: event.target.value }))}
              placeholder="Mô tả"
              rows={2}
              className="rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      {hasCategories ? (
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-2xl border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
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
                    <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.name_ja || item.name_en}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[item.name_en, item.name_vi].filter(Boolean).join(' • ')}
                        </p>
                        {(item.description_ja || item.description_en || item.description_vi) ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
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
                    No items yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Add your first category, then add shared items for every branch.
        </div>
      )}
    </section>
  );
}
