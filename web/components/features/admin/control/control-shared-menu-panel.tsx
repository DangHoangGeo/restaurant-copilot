"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Layers3,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OrganizationSharedMenuCategory } from "@/lib/server/organizations/shared-menu";
import { MenuItemCreationWizard } from "@/components/features/admin/menu/MenuItemCreationWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ControlSharedMenuPanelProps {
  categories: OrganizationSharedMenuCategory[];
  organizationName?: string;
  locale: string;
}

type PrimaryLanguage = "en" | "ja" | "vi";

function localeToPrimaryLanguage(locale: string): PrimaryLanguage {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("ja")) return "ja";
  if (normalizedLocale.startsWith("vi")) return "vi";
  return "en";
}

const SAMPLE_CATEGORIES = [
  {
    key: "starters",
    name_en: "Starters",
    name_ja: "前菜",
    name_vi: "Món khai vị",
  },
  {
    key: "mains",
    name_en: "Main dishes",
    name_ja: "メイン",
    name_vi: "Món chính",
  },
  {
    key: "desserts",
    name_en: "Desserts",
    name_ja: "デザート",
    name_vi: "Món tráng miệng",
  },
  { key: "drinks", name_en: "Drinks", name_ja: "ドリンク", name_vi: "Đồ uống" },
  {
    key: "specials",
    name_en: "Chef specials",
    name_ja: "おすすめ",
    name_vi: "Món đặc biệt",
  },
  {
    key: "kids",
    name_en: "Kids menu",
    name_ja: "キッズメニュー",
    name_vi: "Thực đơn trẻ em",
  },
] as const;

function formatPrice(price: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

async function translateCategoryName(text: string) {
  const response = await fetch("/api/v1/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      field: "name",
      context: "category",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to translate category");
  }

  return response.json() as Promise<{ en: string; ja: string; vi: string }>;
}

export function ControlSharedMenuPanel({
  categories,
  organizationName,
  locale,
}: ControlSharedMenuPanelProps) {
  const router = useRouter();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingSamples, setCreatingSamples] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    primaryName: "",
    primaryLanguage: "en" as PrimaryLanguage,
    name_en: "",
    name_ja: "",
    name_vi: "",
  });
  const hasCategories = categories.length > 0;
  const totalItems = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );
  const existingCategoryNames = useMemo(
    () =>
      new Set(
        categories.flatMap((category) =>
          [category.name_en, category.name_ja, category.name_vi]
            .filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0,
            )
            .map((value) => value.trim().toLowerCase()),
        ),
      ),
    [categories],
  );
  const hasSharedItems = totalItems > 0;
  const setupSteps = [
    {
      label: "Create company categories",
      done: hasCategories,
      detail: hasCategories
        ? `${categories.length} reusable categories are ready`
        : "Start with a small customer menu structure",
    },
    {
      label: "Add reusable dishes",
      done: hasSharedItems,
      detail: hasSharedItems
        ? `${totalItems} company-managed dishes will sync to branches`
        : "Add the dishes every branch should inherit",
    },
    {
      label: "Keep branch menus resolved",
      done: hasCategories,
      detail:
        "Branches inherit this foundation, then keep local overrides auditable",
    },
  ];

  const refresh = () => router.refresh();

  const resetCategoryForm = () => {
    setCategoryForm({
      primaryName: "",
      primaryLanguage: "en",
      name_en: "",
      name_ja: "",
      name_vi: "",
    });
  };

  const handleCreateCategory = async (payload?: {
    name_en: string;
    name_ja?: string;
    name_vi?: string;
  }) => {
    const nameEn = payload?.name_en ?? categoryForm.name_en ?? "";
    const trimmedPrimaryName = categoryForm.primaryName.trim();

    if (!payload && !trimmedPrimaryName && !nameEn.trim()) {
      toast.error("Category name is required");
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
        if (
          !translatedNames.name_en ||
          !translatedNames.name_ja ||
          !translatedNames.name_vi
        ) {
          const translations = await translateCategoryName(
            trimmedPrimaryName || translatedNames.name_en,
          );
          translatedNames = {
            name_en: translatedNames.name_en || translations.en,
            name_ja: translatedNames.name_ja || translations.ja,
            name_vi: translatedNames.name_vi || translations.vi,
          };
        }

        if (categoryForm.primaryLanguage === "en") {
          translatedNames.name_en =
            trimmedPrimaryName || translatedNames.name_en;
        } else if (categoryForm.primaryLanguage === "ja") {
          translatedNames.name_ja =
            trimmedPrimaryName || translatedNames.name_ja;
        } else {
          translatedNames.name_vi =
            trimmedPrimaryName || translatedNames.name_vi;
        }
      }

      const response = await fetch("/api/v1/owner/organization/shared-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          ...translatedNames,
          position: categories.length,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create category");
      }

      if (!payload) {
        toast.success("Shared category added");
        setIsCategoryDialogOpen(false);
        resetCategoryForm();
      }
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create category",
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateSampleCategories = async () => {
    const missingSamples = SAMPLE_CATEGORIES.filter(
      (sample) =>
        ![sample.name_en, sample.name_ja, sample.name_vi].some((value) =>
          existingCategoryNames.has(value.trim().toLowerCase()),
        ),
    );

    if (missingSamples.length === 0) {
      toast.success("Sample categories are already ready");
      return;
    }

    setCreatingSamples(true);
    try {
      for (const [index, sample] of missingSamples.entries()) {
        // Keep order stable by appending sequentially.
        // We refresh after the batch to avoid multiple router refreshes.
        const response = await fetch("/api/v1/owner/organization/shared-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "category",
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
      toast.success("Sample customer categories added");
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add sample categories",
      );
    } finally {
      setCreatingSamples(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Delete this category and its shared items?")) {
      return;
    }

    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/categories/${categoryId}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? "Failed to delete category");
      return;
    }

    toast.success("Category removed");
    refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    const response = await fetch(
      `/api/v1/owner/organization/shared-menu/items/${itemId}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? "Failed to delete item");
      return;
    }

    toast.success("Item removed");
    refresh();
  };

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-[#C8773E]/25 bg-[#FFF7E9] shadow-sm shadow-[#8A4E24]/10">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8773E]/20 bg-[#C8773E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8A4E24]">
              <Layers3 className="h-3.5 w-3.5" />
              One-time setup
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#2E2117] sm:text-3xl">
                Company menu foundation
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A5D45]">
                Build the categories and dishes that every branch should
                inherit. Daily branch menu edits still happen inside each
                branch, but this gives new locations a clean starting menu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-white/75 text-[#6F4B31]"
              >
                {categories.length} categories
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-white/75 text-[#6F4B31]"
              >
                {totalItems} shared items
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-white/75 text-[#6F4B31]"
              >
                Branches inherit on save
              </Badge>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#C8773E]/15 bg-white/70 p-4">
            <p className="text-sm font-semibold text-[#2E2117]">
              Setup progress
            </p>
            <div className="mt-4 space-y-3">
              {setupSteps.map((step) => {
                const Icon = step.done ? CheckCircle2 : Circle;

                return (
                  <div key={step.label} className="flex items-start gap-3">
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        step.done ? "text-emerald-600" : "text-[#B89078]",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#2E2117]">
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[#7A5D45]">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#C8773E]/15 bg-[#F6E8D3]/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p className="text-sm text-[#6F4B31]">
            Start with the starter pack, then add the company dishes customers
            should see everywhere.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-[#C8773E]/25 bg-white/80 text-[#6F4B31] hover:bg-[#FFF7E9]"
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Category
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#C8773E] text-white hover:bg-[#A95F2F]"
              onClick={() => setIsItemDialogOpen(true)}
              disabled={!hasCategories}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Add shared item
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-[#C8773E]/25 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#2E2117]">
                Starter category pack
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#7A5D45]">
                A small structure for QR customers: starters, mains, desserts,
                drinks, specials, and kids.
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
              {creatingSamples ? "Adding..." : "Add pack"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLE_CATEGORIES.map((sample) => {
              const exists = [
                sample.name_en,
                sample.name_ja,
                sample.name_vi,
              ].some((value) =>
                existingCategoryNames.has(value.trim().toLowerCase()),
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
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
                    exists
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-[#C8773E]/15 bg-[#FFF7E9] text-[#6F4B31] hover:border-[#C8773E]/35",
                  )}
                >
                  {sample.name_en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#C8773E]/25 bg-[#FFFDF8] p-4 shadow-sm shadow-[#8A4E24]/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#2E2117]">
                AI-assisted item entry
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#7A5D45]">
                Enter a dish name once, draft the three customer languages, and
                sync the reviewed item to every inherited branch menu.
              </p>
            </div>
            <Badge className="rounded-lg bg-[#E9A35E]/20 text-[#8A4E24] hover:bg-[#E9A35E]/20">
              Review before save
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [
                "Pick category",
                "Choose where the dish belongs in the company menu.",
              ],
              [
                "Draft language",
                "Use the owner language first, then generate customer copy.",
              ],
              [
                "Inherit safely",
                "Branches get the shared source while local overrides stay separate.",
              ],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-[#FFF7E9] px-4 py-3">
                <p className="text-xs font-semibold text-[#8A4E24]">{title}</p>
                <p className="mt-2 text-sm leading-5 text-[#6F4B31]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasCategories ? (
        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="overflow-hidden rounded-[24px] border border-[#D8B993] bg-[#FFFDF8] shadow-sm shadow-[#8A4E24]/5"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#EAD7BD] bg-[#FFF7E9] px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#24170F]">
                    {category.name_ja || category.name_en}
                  </p>
                  <p className="truncate text-xs text-[#6F563E]">
                    {[category.name_en, category.name_vi]
                      .filter(Boolean)
                      .join(" • ")}
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
              <div className="divide-y divide-[#EAD7BD]">
                {category.items.length > 0 ? (
                  category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#24170F]">
                          {item.name_ja || item.name_en}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#6F563E]">
                          {[item.name_en, item.name_vi]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                        {item.description_ja ||
                        item.description_en ||
                        item.description_vi ? (
                          <p className="mt-2 line-clamp-2 text-sm text-[#6F563E]">
                            {item.description_ja ||
                              item.description_en ||
                              item.description_vi}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-[#24170F]">
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
                  <div className="bg-[#FFFCF6] px-4 py-5 text-sm font-medium text-[#6F563E]">
                    No items yet. Add one reusable dish for this category.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#D8B993] bg-[#FFFDF8] px-4 py-10 text-center text-sm font-medium text-[#6F563E]">
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
              Founders usually only need the category name. We can fill the
              other languages automatically.
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
                  setCategoryForm((current) => ({
                    ...current,
                    name_en: event.target.value,
                  }))
                }
                placeholder="English"
                className="h-11 rounded-2xl"
              />
              <Input
                value={categoryForm.name_ja}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name_ja: event.target.value,
                  }))
                }
                placeholder="日本語"
                className="h-11 rounded-2xl"
              />
              <Input
                value={categoryForm.name_vi}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name_vi: event.target.value,
                  }))
                }
                placeholder="Tiếng Việt"
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              If you only type one language, AI translation fills the rest on
              save.
            </p>
            <Button
              type="button"
              onClick={() => handleCreateCategory()}
              disabled={creatingCategory}
              className="rounded-xl gap-2"
            >
              {creatingCategory && (
                <Sparkles className="h-4 w-4 animate-pulse" />
              )}
              Save category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MenuItemCreationWizard
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        mode="organization-shared"
        categories={categories.map((category) => ({
          id: category.id,
          name_en: category.name_en,
          name_ja: category.name_ja,
          name_vi: category.name_vi,
          source: "organization",
          itemCount: category.items.length,
        }))}
        ownerLanguage={localeToPrimaryLanguage(locale)}
        locale={locale}
        organizationName={organizationName ?? null}
        onCreated={refresh}
      />
    </section>
  );
}
